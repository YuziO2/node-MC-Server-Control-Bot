import { NodeSSH, SSHExecCommandResponse } from "node-ssh";
import { mcServerConfig } from "./config.js";

const { sshUsername, sshPrivateKeyPath, startCommand, serverPath } =
  mcServerConfig;

async function sleep(second: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, second * 1000);
  });
}

export default class {
  pid = "";
  ssh;
  constructor() {
    this.ssh = new NodeSSH();
  }
  async connect(ip: string) {
    return this.ssh.connect({
      host: ip,
      username: sshUsername,
      privateKeyPath: sshPrivateKeyPath,
    });
  }
  async mount() {
    this.#checkError(
      await this.ssh.execCommand("sudo mount /dev/vdb1 ./vdb1", {
        cwd: `/home/${sshUsername}`,
      }),
      "挂载硬盘到目录"
    );
  }
  async start() {
    this.#checkError(
      await this.ssh.execCommand(`nohup ${startCommand} > ./log.log 2>&1 &`, {
        cwd: `/home/${sshUsername}/vdb1${serverPath}`,
      }),
      "启动服务器"
    );
    await sleep(30);
    const { pid, processName } = await this.getHighestMemProcess();
    if (processName != "java") {
      throw new Error("启动MC服务器指令已发送，但是启动失败了！");
    }
    this.pid = pid;
  }
  async stop(pid = this.pid) {
    if (!pid) return;
    this.#checkError(await this.ssh.execCommand(`kill -15 ${pid}`));
    this.pid = "";
  }
  #checkError(sshResult: SSHExecCommandResponse, type = "") {
    if (sshResult.stderr) {
      throw new Error(type + "\n" + sshResult.stderr);
    }
  }
  async getHighestMemProcess() {
    const result = await this.ssh.execCommand(
      "ps -eo pid,%mem,cmd --sort=-%mem | head -n 2"
    );
    this.#checkError(result);
    let arr = result.stdout.split(" ").filter((v) => v != "");
    //PID是arr[3],进程名是arr[5]
    const pid = arr[3],
      processName = arr[5];
    return { pid, processName };
  }
}
