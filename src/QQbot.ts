/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-01
 * @LastEditors: HumXC Hum-XC@outlook.com
 * @LastEditTime: 2022-07-23
 * @FilePath: \QQbot\src\QQbot.ts
 * @Description:应用程序入口，创建和管理所有的账户
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */
import fs from "fs";
import path from "path";
import log4js from "log4js";
import { Client } from "./lib";
import { ChildProcess, fork } from "child_process";
import { getStdInput } from "./lib/util";
import { ProcessMessage } from "./lib/client";

class CommandLine {
    public async lisen(): Promise<string> {
        process.stdout.write("> ");
        return await getStdInput();
    }
    public log = console.log;
    public warn(str: string) {
        this.log("[Warn] " + str);
    }
    public error(str: string) {
        this.log("[Error] " + str);
    }
}

class Bot {
    private process: ChildProcess;
    public log: Buffer[] = [];
    private cl: CommandLine;
    private uid: number;
    constructor(commandLine: CommandLine, process: ChildProcess, uid: number) {
        this.process = process;
        this.cl = commandLine;
        this.uid = uid;
        this.process.stdout?.on("data", (data: Buffer) => {
            this.log.push(data);
            if (this.log.length > 1024) {
                this.log.shift();
            }
        });
        this.process.on("close", (code) => {
            this.cl.warn(`子进程关闭 [${this.uid}] code=${code}`);
        });
        this.process.on("message", (data: ProcessMessage) => {
            this.parseMsg(data);
        });
    }
    public pipe() {
        this.process.stdout?.pipe(process.stdout);
        if (this.process.stdin) {
            process.stdin.pipe(this.process.stdin);
        }
    }
    public unpipe() {
        this.process.stdout?.unpipe();
    }
    public stop() {
        this.process.removeAllListeners();
        this.process.kill();
    }
    private parseMsg(data: ProcessMessage) {
        switch (data.msg) {
            case "started":
                this.unpipe();
                break;
            case "login":
                this.pipe();
                break;
            default:
                break;
        }
    }
}

const args = process.argv.slice(2);
if (args[0] === "child") {
    let uid = Number.parseInt(args[1]);
    let config = JSON.parse(args[2]);
    new Client(uid, config).start();
} else {
    main();
}

/** 主进程 */
async function main() {
    const logger = log4js.getLogger("BotFather");
    logger.level = log4js.levels.ALL;
    let config: any = undefined;
    const confpath = path.join(require?.main?.path || process.cwd(), "config.js");
    let cl: CommandLine = new CommandLine();
    if (!fs.existsSync(confpath)) {
        fs.copyFileSync(path.join(__dirname, "lib/config.sample.js"), confpath);
        cl.log("配置文件不存在，已帮你自动生成，请修改后再次启动程序。");
        return;
    }
    config = require(confpath);

    let bots: Map<number, Bot> = new Map<number, Bot>();

    await start();

    // 启动所有机器人客户端
    async function start() {
        // 从配置分离qq号
        let uids: number[] = [];
        Object.keys(config).forEach((v) => {
            if (v !== "general") {
                let uid = Number.parseInt(v);
                if (uid < 10000 || uid > 0xffffffff) {
                    cl.error(`错误的QQ号:[${uid}],请尝试修改config.js`);
                    return;
                }
                uids.push(uid);
            }
        });
        for (const uid of uids) {
            await startBot(uid, Object.assign(config.general, config[uid]));
        }
    }

    async function startBot(uid: number, conf: any) {
        cl.log(`正在启动 [${uid}]`);
        let child = fork(__filename, ["child", uid.toString(), JSON.stringify(conf)], {
            silent: true,
        });

        bots.set(uid, new Bot(cl, child, uid));
    }
}
