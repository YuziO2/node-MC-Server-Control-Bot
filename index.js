import TelegramBot from "node-telegram-bot-api";
import { NodeSSH } from "node-ssh";
import {
  createInstance,
  describeInstances,
  destroyInstances,
} from "./TencentCloud/Instance.js";
import { mountDisk } from "./TencentCloud/CloudDisk.js";
import { describeAccountBalance } from "./TencentCloud/Billing.js";
import DDNS from "./DDNS.js";

const token = "your_tg_bot_token";

let ProcessLOCK = 0; //0为没有占用，可以执行开启关闭，1为被占用，拒绝访问
let Status = 0; //0为关闭，1为开启
let InstanceId = ""; //实例ID
let ip = null;
let pid = ""; //Java进程的pid

const hostName = "your.domain.name";
const privateKeyPath = "path/to/your/privateKey";

function verifyIdentity(userId, chatId) {
  //  可以自己定义
  if (chatId == 114514 && [1919, 810].includes(userId)) return true;
  return false;
}

const bot = new TelegramBot(token, {
  polling: true,
  request: {
    proxy: "http://127.0.0.1:7890", //代理依网络情况而定
  },
});

bot.onText(/\/startserver/, async (msg) => {
  try {
    if (!verifyIdentity(msg.from.id, msg.chat.id)) {
      await bot.sendMessage(msg.chat.id, "您没有权限！");
      return;
    }
    if (ProcessLOCK != 0) {
      await bot.sendMessage(msg.chat.id, "指令运行中，请稍候！");
      return;
    }
    ProcessLOCK = 1; //上锁
    if (Status != 0) {
      bot.sendMessage(msg.chat.id, "服务器已经开启，无法再开！");
      ProcessLOCK = 0;
      return;
    }
    bot.sendMessage(msg.chat.id, "准备开启服务器……");
    InstanceId = await createInstance(); //创建实例
    while (!ip) {
      ip = await describeInstances(InstanceId).then(
        (data) => data.InstanceSet[0].PublicIpAddresses?.[0]
      );
      await new Promise((resolve) =>
        setTimeout(() => {
          resolve();
        }, 5000)
      ); //休眠5秒
    } //直到有ip了才继续
    bot.sendMessage(msg.chat.id, "实例创建成功，ip为：" + ip);
    await DDNS(ip);
    while (
      (await describeInstances(InstanceId).then(
        (data) => data.InstanceSet[0].InstanceState
      )) != "RUNNING"
    ) {
      await new Promise((resolve) =>
        setTimeout(() => {
          resolve();
        }, 5000)
      ); //休眠5秒
    } //等待至实例启动完成
    await mountDisk(InstanceId); //挂载硬盘
    const ssh = new NodeSSH();
    await new Promise((resolve) =>
      setTimeout(() => {
        resolve();
      }, 30000)
    ); //休眠30秒
    await ssh.connect({
      host: ip,
      username: "ubuntu",
      privateKeyPath,
    });
    let sshResult;
    sshResult = await ssh.execCommand("sudo mount /dev/vdb1 ./vdb1", {
      cwd: "/home/ubuntu",
    }); //挂载硬盘到指定目录
    if (sshResult.stderr != "") throw new Error(sshResult.stderr);
    sshResult = await ssh.execCommand(
      "nohup ./start.sh > ./log.log 2>&1 & echo $!",
      {
        cwd: "/home/ubuntu/vdb1/your_server_folder_name",
      }
    ); //启动服务器
    if (sshResult.stderr != "") throw new Error(sshResult.stderr);
    pid = (parseInt(sshResult.stdout) + 1).toString(); //$!是当前的后台进程./start.sh，它会立即启动java进程，pid比它大1.也就是需要kill的
    await bot.sendMessage(
      msg.chat.id,
      `服务器已启动！\n地址：${ip}\n${hostName}\nMTR地图地址：https://${hostName}:8889/index.html`
    );
    Status = 1; //设置状态为已启动
    ProcessLOCK = 0; //释放锁
  } catch (e) {
    bot.sendMessage(msg.chat.id, "发生错误！\n" + e);
    if (InstanceId) {
      destroyInstances(InstanceId);
      InstanceId = "";
      ip = null;
    }
    ProcessLOCK = 0; //释放锁
  }
});

bot.onText(/\/stopserver/, async (msg) => {
  try {
    if (!verifyIdentity(msg.from.id, msg.chat.id)) {
      await bot.sendMessage(msg.chat.id, "您没有权限！");
      return;
    }
    if (ProcessLOCK != 0) {
      await bot.sendMessage(msg.chat.id, "指令运行中，请稍候！");
      return;
    }
    ProcessLOCK = 1; //上锁
    if (Status != 1) {
      bot.sendMessage(msg.chat.id, "服务器未开启，无法关闭！");
      ProcessLOCK = 0;
      return;
    }
    bot.sendMessage(msg.chat.id, "准备关闭服务器……");
    const ssh = new NodeSSH();
    await ssh.connect({
      host: ip,
      username: "ubuntu",
      privateKeyPath,
    });
    let sshResult;
    sshResult = await ssh.execCommand("kill -15 " + pid, {
      cwd: "/home/ubuntu",
    }); //关闭Java进程
    if (sshResult.stderr != "") throw new Error(sshResult.stderr);
    await new Promise((resolve) =>
      setTimeout(() => {
        resolve();
      }, 15000)
    ); //休眠15秒
    pid = "";
    bot.sendMessage(msg.chat.id, "服务器进程关闭完成，准备销毁实例");
    await destroyInstances(InstanceId);
    await bot.sendMessage(msg.chat.id, `实例已销毁。\n关闭完成`);
    InstanceId = "";
    ip = null;
    Status = 0; //设置状态为已关闭
    ProcessLOCK = 0; //释放锁
  } catch (e) {
    bot.sendMessage(msg.chat.id, "发生错误！\n" + e);
    if (InstanceId) {
      destroyInstances(InstanceId);
      InstanceId = "";
      ip = null;
    }
    ProcessLOCK = 0; //释放锁
  }
});

bot.onText(/\/set_lock (.+)/, async (msg, match) => {
  if (!verifyIdentity(msg.from.id, msg.chat.id)) {
    await bot.sendMessage(msg.chat.id, "您没有权限！");
    return;
  }
  switch (match[1]) {
    case "0":
      ProcessLOCK = 0;
      bot.sendMessage(
        msg.chat.id,
        "将进程锁设置为‘0’\n注意，这可能导致创建出多余的实例，请在需要时才这么做！"
      );
      break;
    case "1":
      ProcessLOCK = 1;
      bot.sendMessage(
        msg.chat.id,
        "将进程锁设置为‘1’\n注意，这会导致其他指令无法使用，在debug结束后请置0"
      );
      break;
    default:
      bot.sendMessage(msg.chat.id, "参数错误！值为0或1\n作用：修改进程锁状态");
  }
});

bot.onText(/\/set_status (.+)/, async (msg, match) => {
  if (!verifyIdentity(msg.from.id, msg.chat.id)) {
    await bot.sendMessage(msg.chat.id, "您没有权限！");
    return;
  }
  switch (match[1]) {
    case "0":
      Status = 0;
      bot.sendMessage(
        msg.chat.id,
        "将状态锁设置为‘0’\n现在机器人默认服务器为关闭状态"
      );
      break;
    case "1":
      Status = 1;
      bot.sendMessage(
        msg.chat.id,
        "将状态锁设置为‘1’\n现在机器人默认服务器为开启状态"
      );
      break;
    default:
      bot.sendMessage(msg.chat.id, "参数错误！值为0或1\n作用：修改状态锁状态");
  }
});

function getStatusStr() {
  if (ProcessLOCK) {
    //启动或关闭中
    if (Status == 0) {
      //正在开启
      return "服务器启动中……";
    }
    return "服务器关闭中……";
  } else {
    if (Status == 0) {
      return "服务器已关闭";
    }
    return "服务器已开启";
  }
}

bot.onText(/\/status/, async (msg) => {
  if (msg.chat.id != 114514) {
    await bot.sendMessage(msg.chat.id, "您没有权限！");
    return;
  }
  await bot.sendMessage(
    msg.chat.id,
    `*服务器状态*\n---------------\n进程锁：${ProcessLOCK}\n${getStatusStr()}\nIP：${
      ip ? ip : ""
    }\n实例ID：${InstanceId}\nJava进程的pid：${pid}\nMTR地图地址：https://${hostName}:8889/index.html\n---------------\n账户余额：${
      (await describeAccountBalance()) / 100 + "元"
    }`,
    { parse_mode: "Markdown" }
  );
});
