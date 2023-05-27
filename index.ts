import TelegramBot from "node-telegram-bot-api";
import MCServer from "./MCServer.js";
import {
  createInstance,
  describeInstances,
  destroyInstances,
} from "./TencentCloud/Instance.js";
import { mountDisk } from "./TencentCloud/CloudDisk.js";
import { describeAccountBalance } from "./TencentCloud/Billing.js";
import DDNS from "./DDNS.js";
import { generalConfig, tgBotConfig } from "./config.js";

let ProcessLOCK = 0; //0为没有占用，可以执行开启关闭，1为被占用，拒绝访问
let Status = 0; //0为关闭，1为开启
let InstanceId = ""; //实例ID
let ip: string | null = null;
let mcServer: MCServer | null = null;

const { hostName } = generalConfig;
const { token, privilegedGroups, privilegedPersons } = tgBotConfig;

function verifyIdentity(userId: number | undefined, chatId: number) {
  if (!userId) return false
  if (privilegedGroups.includes(chatId) && privilegedPersons.includes(userId))
    return true;
  return false;
}

async function sleep(second: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, second * 1000);
  });
}

const bot = new TelegramBot(token, {
  polling: true,
  request: tgBotConfig.proxy
    ? {
      url: '',
      proxy: tgBotConfig.proxy,
    }
    : undefined,
});

bot.onText(/\/startserver/, async (msg) => {
  try {
    if (!verifyIdentity(msg.from?.id, msg.chat.id)) {
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
    InstanceId = await createInstance() as string; //创建实例
    while (!ip) {
      ip = await describeInstances(InstanceId).then(
        (data) => data.InstanceSet[0].PublicIpAddresses?.[0]
      ) as string;
      await sleep(5);
    } //直到有ip了才继续
    bot.sendMessage(msg.chat.id, "实例创建成功，ip为：" + ip);
    await DDNS(ip);
    while (
      (await describeInstances(InstanceId).then(
        (data) => data.InstanceSet[0].InstanceState
      )) != "RUNNING"
    ) {
      await sleep(5);
    } //等待至实例启动完成
    await mountDisk(InstanceId); //挂载硬盘
    mcServer = new MCServer(); //TODO:提到创建实例成功的下方，这样mcServer就可以替代Status的功能
    await sleep(30);
    await mcServer.connect(ip);
    await mcServer.mount();
    try {
      await mcServer.start();
    } catch (e) {
      bot.sendMessage(
        msg.chat.id,
        "MC服务器启动发生错误！\n" +
        e +
        "\n服务器并没有关闭，可以尝试使用 /startMC 来再次启动服务器"
      );
      Status = 1;
      ProcessLOCK = 0; //释放锁
      return;
    }
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

let startMCDoubleCheckFlag = true;
bot.onText(/\/start_mc/, async (msg) => {
  try {
    if (!verifyIdentity(msg.from?.id, msg.chat.id)) {
      await bot.sendMessage(msg.chat.id, "您没有权限！");
      return;
    }
    if (Status != 1) {
      bot.sendMessage(msg.chat.id, "物理服务器未开启，无法开启MC服务器！");
      return;
    }
    if (ProcessLOCK != 0) {
      await bot.sendMessage(msg.chat.id, "指令运行中，请稍候！");
      return;
    }
    ProcessLOCK = 1; //上锁
    mcServer = mcServer || new MCServer();
    if ((await mcServer.getHighestMemProcess()).processName == "java") {
      if (startMCDoubleCheckFlag) {
        await bot.sendMessage(
          msg.chat.id,
          "检测到java进程正在运行中，使用此指令会重启当前的服务器！\n如果确实要这么做，请再次使用本指令！"
        );
        startMCDoubleCheckFlag = false;
        ProcessLOCK = 0;
        return;
      }
      await bot.sendMessage(msg.chat.id, "关闭Java进程中……");
      mcServer.stop((await mcServer.getHighestMemProcess()).pid);
      startMCDoubleCheckFlag = true;
      await sleep(15);
    }
    await bot.sendMessage(msg.chat.id, "启动MC服务端中……");
    await mcServer.start();
    await bot.sendMessage(
      msg.chat.id,
      `服务器已启动！\n地址：${ip}\n${hostName}\nMTR地图地址：https://${hostName}:8889/index.html`
    );
    ProcessLOCK = 0;
  } catch (e) {
    bot.sendMessage(
      msg.chat.id,
      "发生错误！\n" +
      e +
      "\n服务器并没有关闭，可以尝试使用 /start_mc 来再次启动服务器"
    );
    ProcessLOCK = 0; //释放锁
    return;
  }
});

bot.onText(/\/stopserver/, async (msg) => {
  try {
    if (!verifyIdentity(msg.from?.id, msg.chat.id)) {
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
    await mcServer?.stop();
    await sleep(20);
    bot.sendMessage(msg.chat.id, "服务器进程关闭完成，准备销毁实例");
    await destroyInstances(InstanceId);
    await bot.sendMessage(msg.chat.id, `实例已销毁。\n关闭完成`);
    InstanceId = "";
    ip = null;
    mcServer = null;
    Status = 0; //设置状态为已关闭
    ProcessLOCK = 0; //释放锁
  } catch (e) {
    bot.sendMessage(msg.chat.id, "发生错误！\n" + e);
    if (InstanceId) {
      destroyInstances(InstanceId);
      InstanceId = "";
      ip = null;
    }
    mcServer = null;
    Status = 0; //设置状态为已关闭
    ProcessLOCK = 0; //释放锁
  }
});

bot.onText(/\/set_lock (.+)/, async (msg, match) => {
  if (!verifyIdentity(msg.from?.id, msg.chat.id)) {
    await bot.sendMessage(msg.chat.id, "您没有权限！");
    return;
  }
  switch (match![1]) {
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
  if (!verifyIdentity(msg.from?.id, msg.chat.id)) {
    await bot.sendMessage(msg.chat.id, "您没有权限！");
    return;
  }
  switch (match![1]) {
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
  if (!privilegedGroups.includes(msg.chat.id)) {
    await bot.sendMessage(msg.chat.id, "您没有权限！");
    return;
  }
  await bot.sendMessage(
    msg.chat.id,
    `*服务器状态*\n---------------\n进程锁：${ProcessLOCK}\n${getStatusStr()}\nIP：${ip ? ip : ""
    }\n实例ID：${InstanceId}${mcServer?.pid ? `\nJava进程的pid：${mcServer.pid}` : ""
    }\nMTR地图地址：https://${hostName}:8889/index.html\n---------------\n账户余额：${(await describeAccountBalance()) / 100 + "元"
    }`,
    { parse_mode: "Markdown" }
  );
});

//提醒关服,1小时检查一次
setInterval(() => {
  if (Status) {
    privilegedGroups.forEach((privilegedGroup) => {
      bot.sendMessage(
        privilegedGroup,
        "提醒：\n服务器仍然开启中，请不要忘记关服！"
      );
    });
  }
}, 3600000);
