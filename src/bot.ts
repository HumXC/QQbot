/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-01
 * @LastEditors: HumXC Hum-XC@outlook.com
 * @LastEditTime: 2022-07-24
 * @FilePath: \QQbot\src\bot.ts
 * @Description:应用程序入口，创建和管理所有的账户
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */
import fs from "fs";
import path from "path";
import log4js from "log4js";
import { Client, Config } from "./lib";
import { ChildProcess, fork } from "child_process";
import { getStdInput } from "./lib/util";
import { ProcessMessage } from "./lib/client";
import * as oicq from "oicq";

type Command = {
    cmd: string;
    func: (...args: string[]) => string | void | Promise<string | void>;
    help?: string;
};
class CommandLine {
    public async lisen(): Promise<string> {
        process.stdout.write("> ");
        return await getStdInput();
    }
    public log = console.log;
    public warn(message?: any, ...optionalParams: any[]) {
        console.warn("[Warn]", message, ...optionalParams);
    }
    public error(message?: any, ...optionalParams: any[]) {
        console.error("[Error]", message, ...optionalParams);
    }
}

class Bot {
    public isLinked: boolean = false;
    public isRunning: boolean = false;
    private process?: ChildProcess;
    private cl: CommandLine;
    public uid: number;
    public config: Config & oicq.Config;
    public admins: number[] = [];
    public nickname: string = "undefined";

    constructor(commandLine: CommandLine, uid: number, config: Config & oicq.Config) {
        this.cl = commandLine;
        this.config = config;
        this.cl.log(`正在启动 [${uid}]`);
        this.uid = uid;
    }

    public pipe() {
        if (!this.process) {
            return;
        }
        this.process.stdout?.pipe(process.stdout);
        if (this.process.stdin) {
            process.openStdin().pipe(this.process.stdin);
        }
    }
    public unpipe() {
        if (!this.process) {
            return;
        }
        this.process.stdout?.unpipe(process.stdout);
        if (this.process.stdin) {
            process.stdin.unpipe();
        }
        process.openStdin();
    }
    public kill() {
        if (!this.process) {
            return;
        }
        this.unpipe();
        this.process.removeAllListeners();
        if (this.process.pid) {
            process.kill(this.process.pid);
        }
        this.process = undefined;
        this.isRunning = false;
    }

    public async start() {
        if (this.process) {
            return;
        }
        this.process = fork(
            __filename,
            ["child", this.uid.toString(), JSON.stringify(this.config)],
            {
                silent: true,
                detached: true,
                killSignal: "SIGHUP",
            }
        );
        this.process.unref();

        this.process.on("close", (code) => {
            this.cl.warn(`子进程关闭 [${this.uid}] code=${code}`);
        });
        this.process.on("error", (error) => {
            this.cl.error(`[${this.uid}]`, error);
        });
        this.process.on("message", (data: ProcessMessage) => {
            this.parseMsg(data);
        });
        await this.waitStarted();
    }
    private parseMsg(message: ProcessMessage) {
        if (!this.process) {
            return;
        }
        switch (message.msg) {
            case "started":
                this.unpipe();
                if (message.data) {
                    this.admins = message.data.admins;
                    this.nickname = message.data.nickname;
                }
                this.isRunning = true;
                this.process.emit("started");
                break;
            case "login":
                this.pipe();
                break;

            case "error":
                let e: { message: string; stack: string } = message.data;
                this.cl.error(`[${this.uid}]`, e.message, "\n" + e.stack);
                break;
            default:
                break;
        }
    }

    private waitStarted(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.isRunning) {
                resolve();
                return;
            }
            if (this.process) {
                this.process.once("started", resolve);
            } else {
                reject(new Error("机器人子进程未创建"));
            }
        });
    }
}

const args = process.argv.slice(2);
if (args[0] === "child") {
    let uid = Number.parseInt(args[1]);
    let config = JSON.parse(args[2]);
    new Client(uid, config).start();
} else {
    main(args);
}

/** 主进程 */
async function main(args: string[]) {
    process.title = "Bot_Main_Process";

    console.log(args);

    const logger = log4js.getLogger("BotFather");
    logger.level = log4js.levels.ALL;
    let config: any = undefined;
    const confpath = path.join(require?.main?.path || process.cwd(), "config.js");
    let cl: CommandLine = new CommandLine();
    let commands: Command[] = [
        { cmd: "ls", func: ls, help: "ls - 列出所有机器人账户" },
        { cmd: "start", func: start, help: "start [qq] - 启动机器人" },
        { cmd: "kill", func: kill, help: "kill [qq] - 结束指定机器人进程" },
        { cmd: "log", func: log, help: "log [qq] - 查看日志" },
        { cmd: "help", func: help },
    ];
    if (!fs.existsSync(confpath)) {
        fs.copyFileSync(path.join(__dirname, "lib/config.sample.js"), confpath);
        cl.log("配置文件不存在，已帮你自动生成，请修改后再次启动程序。");
        return;
    }
    config = require(confpath);
    let bots: Map<number, Bot> = new Map<number, Bot>();
    // 启动所有机器人客户端
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
        let bot = new Bot(cl, uid, Object.assign(config.general, config[uid]));
        await bot.start();
        bots.set(uid, bot);
    }
    while (true) {
        let input = await cl.lisen();
        await runCommand(input);
    }

    async function runCommand(input: string): Promise<void> {
        for (let i = 0; i < commands.length; i++) {
            const command = commands[i];
            let regExp = new RegExp(`^${command.cmd}$|^${command.cmd} `, "g");
            if (regExp.exec(input) !== null) {
                let args = input.replace(/  +| \$/g, "").split(" ");
                args.shift();
                let msg = await command.func(...args);
                if (msg) {
                    cl.log(msg);
                }
            }
        }
    }

    function ls(): string | void {
        let msg = "";
        for (const bot of bots.values()) {
            msg += ` - [${bot.uid}] ${bot.nickname} admins: [${bot.admins.toString()}] state: ${
                bot.isRunning ? "Running" : "Killed"
            }\n`;
        }
        msg = msg.replace(/\n$/g, "");
        return msg;
    }
    function log(...uids: string[]): string {
        let msg = "";
        let bot = bots.get(Number.parseInt(uids[0]));
        if (bot) {
            let dir = path.join("log", bot.uid.toString());
            let files = fs.readdirSync(dir);
            if (files.length === 0) {
                return "未找到日志";
            }
            let stream = fs.createReadStream(path.join(dir, files[files.length - 1]));
            stream.pipe(process.stdout);
            stream.on("end", () => {
                stream.close();
            });
        } else {
            return "没有找到对应的机器人";
        }
        return msg;
    }
    async function kill(...uids: string[]): Promise<string> {
        let msg = "";
        let killed: number[] = [];
        let notfind: number[] = [];
        let k = async (bot: Bot) => {
            bot.kill();
            killed.push(bot.uid);
        };
        if (uids.length === 0) {
            return "未提供需要结束的机器人账号";
        }
        for (let i = 0; i < uids.length; i++) {
            let uid = Number.parseInt(uids[i]);
            let bot = bots.get(uid);
            if (bot) {
                k(bot);
            } else {
                notfind.push(uid);
            }
        }
        if (killed.length !== 0) {
            msg += "结束进程 -";
            for (let i = 0; i < killed.length; i++) {
                msg += ` [${killed[i]}]`;
            }
        }
        if (notfind.length !== 0) {
            if (msg !== "") {
                msg += "\n";
            }
            msg += "没有找到 -";
            for (let i = 0; i < notfind.length; i++) {
                msg += ` [${notfind[i]}]`;
            }
        }
        return msg;
    }
    async function start(...uids: string[]): Promise<string> {
        let msg = "";
        let started: number[] = [];
        let running: number[] = [];
        let notfind: number[] = [];
        let s = async (bot: Bot) => {
            await bot.start();
            started.push(bot.uid);
        };
        for (let i = 0; i < uids.length; i++) {
            let uid = Number.parseInt(uids[i]);
            let bot = bots.get(uid);
            if (bot) {
                if (bot.isRunning) {
                    running.push(uid);
                } else {
                    await s(bot);
                }
            } else {
                notfind.push(uid);
            }
        }
        if (uids.length === 0) {
            for (const bot of bots.values()) {
                if (bot.isRunning) {
                    running.push(bot.uid);
                } else {
                    await s(bot);
                }
            }
        }
        if (running.length !== 0) {
            msg += "正在运行 -";
            for (let i = 0; i < running.length; i++) {
                msg += ` [${running[i]}]`;
            }
        }
        if (started.length !== 0) {
            if (msg !== "") {
                msg += "\n";
            }
            msg += "开启进程 -";
            for (let i = 0; i < started.length; i++) {
                msg += ` [${started[i]}]`;
            }
        }
        if (notfind.length !== 0) {
            if (msg !== "") {
                msg += "\n";
            }
            msg += "没有找到 -";
            for (let i = 0; i < notfind.length; i++) {
                msg += ` [${notfind[i]}]`;
            }
        }
        return msg;
    }
    function help(): string {
        let msg: string = "";
        for (let index = 0; index < commands.length; index++) {
            if (commands[index].help) {
                if (index === commands.length - 1) {
                    msg += commands[index].help;
                } else {
                    msg += commands[index].help + "\n";
                }
            }
        }
        return msg;
    }
}
