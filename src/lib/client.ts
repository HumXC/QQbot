/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-02
 * @LastEditors: HumXC Hum-XC@outlook.com
 * @LastEditTime: 2022-08-17
 * @FilePath: \QQbot\src\lib\client.ts
 * @Description:机器人的客户端，对 oicq 的封装
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */
import * as _oicq from "oicq";
import { Config } from "./config";
import { getStdInput, sleep } from "./util";
import EventEmitter from "events";
import { EventMap } from "./events";
import { PluginManager } from "./plugin/manager";
import log4js from "log4js";
import path from "path";
process.on("uncaughtException", (error) => {
    send({ msg: "error", data: { message: error.message, stack: error.stack } });
    console.error(error);
});
process.on("uncaughtExceptionMonitor", (error) => {
    send({ msg: "error", data: { message: error.message, stack: error.stack } });
    console.error(error);
});
process.on("unhandledRejection", (error: Error) => {
    send({ msg: "error", data: { message: error.message, stack: error.stack } });
    console.error(error);
});
/** 进程间通信的消息格式 */
export type ProcessMessage = {
    msg: "started" | "login" | "error";
    data?: any;
};

/** 事件接口 */
export interface Client {
    on<T extends keyof EventMap>(event: T, listener: EventMap<this>[T]): this;
    on<S extends string | symbol>(
        event: S & Exclude<S, keyof EventMap>,
        listener: (this: this, ...args: any[]) => void
    ): this;
    once<T extends keyof EventMap>(event: T, listener: EventMap<this>[T]): this;
    once<S extends string | symbol>(
        event: S & Exclude<S, keyof EventMap>,
        listener: (this: this, ...args: any[]) => void
    ): this;
    prependListener<T extends keyof EventMap>(event: T, listener: EventMap<this>[T]): this;
    prependListener(event: string | symbol, listener: (this: this, ...args: any[]) => void): this;
    prependOnceListener<T extends keyof EventMap>(event: T, listener: EventMap<this>[T]): this;
    prependOnceListener(
        event: string | symbol,
        listener: (this: this, ...args: any[]) => void
    ): this;
}
export class Client extends EventEmitter {
    // oicq 客户端
    public oicq: _oicq.Client;
    // 日志器
    public logger: _oicq.Logger;
    // 管理员列表
    public readonly admins: Set<number> = new Set<number>();
    // 配置文件
    public readonly config: Config & _oicq.Config;
    // 插件管理器
    private pluginManager: PluginManager;
    // 消息处理器
    // 关键词管理器
    // 命令管理器
    constructor(uid: number, config: Config & _oicq.Config) {
        super();
        this.config = config;
        this.oicq = _oicq.createClient(uid, config);
        this.logger = this.oicq.logger;
        this.pluginManager = new PluginManager(this);

        //一天更替事件
        let nowDate = new Date();
        let timeout =
            new Date(nowDate.getFullYear(), nowDate.getMonth(), 2 + nowDate.getDate()).getTime() -
            nowDate.getTime();
        setTimeout(() => {
            this.emit("newday");
            setInterval(() => {
                this.emit("newday");
            }, 86400000);
        }, timeout);

        // 导入管理员列表
        for (let i = 0; i < config.admin.length; i++) {
            this.admins.add(config.admin[i]);
        }
    }
    /**
     * @description: 启动机器人
     */
    public async start(): Promise<void> {
        this.oicq.on("system.login.device", () => {
            getStdInput().then(() => {
                this.oicq.login();
            });
        });
        this.oicq
            .on("system.login.slider", async () => {
                console.log("输入ticket：");
                this.oicq.submitSlider((await getStdInput()).trim());
            })
            .login(this.config.password);
        // 二维码登录
        this.oicq.on("system.login.qrcode", () => {
            this.login();
        });
        send({ msg: "login" });
        this.pluginManager.load(this.config.plugins);
        this.login();
        await this.waitOnline();
        this.pluginManager.init();
        send({
            msg: "started",
            data: {
                nickname: this.oicq.nickname,
                admins: this.config.admin,
            },
        });
        // 设置日志
        log4js.configure({
            appenders: {
                production: {
                    type: "dateFile",
                    filename: path.join("log", this.oicq.uin.toString(), "bot.log"),
                    alwaysIncludePattern: true,
                    keepFileExt: true,
                    numBackups: 30,
                },
            },
            categories: {
                default: { appenders: ["production"], level: "debug" },
            },
        });
    }

    /**
     * @description: 对登录过程的进一步封装
     * @param {string} passwd - 密码或者密码的 md5 值
     * @return {boolean} 返回值表示登录是否成功
     */
    private login(): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            this.oicq.once("system.login.error", () => {
                resolve(false);
            });
            this.oicq.once("system.online", () => {
                resolve(true);
            });

            this.oicq.login(this.config.password);
        });
    }

    /**
     * @description: 等待 oicq 完成登录
     */
    private waitOnline(): Promise<void> {
        return new Promise<void>((resolve) => {
            this.oicq.once("system.online", () => {
                resolve();
            });
        });
    }

    /**
     * @description: 依次给此机器人账户的所有管理员发送消息。
     * @param {(string | oicq.MessageElem)[]} message - 需要发送的消息
     */
    public async callAdmin(...message: (string | _oicq.MessageElem)[]) {
        for (const admin of this.admins.values()) {
            try {
                await this.oicq.sendPrivateMsg(admin, message);
                // 发送过快可能会被检测为异常而冻结
                await sleep(500);
            } catch (error) {
                this.logger.error(error);
            }
        }
    }

    /**
     * @description: 判断 qq 号是否为此机器人的管理员。
     * @param {number} uid - 需要判断的 qq 号
     * @return {boolean} 如果传入的 qq 号在管理员列表内则返回 true
     */
    public isAdmin(uid: number): boolean {
        return this.admins.has(uid);
    }

    /**
     * @description: 判断 qq 号是否为此机器人的好友。
     * @param {number} uid - 需要判断的 qq 号
     * @return {boolean} 如果传入的 qq 号在好友列表内则返回 true
     */
    public isFriend(uid: number): boolean {
        return this.oicq.fl.has(uid);
    }

    /** emit an event */
    em<K extends keyof EventMap>(name: K, data?: any) {
        let _name: string = name;
        while (true) {
            this.emit(_name, data);
            let i = _name.lastIndexOf(".");
            if (i === -1) {
                break;
            }
            _name = _name.slice(0, i);
        }
    }
}
/**
 * @description: 向主进程发送消息
 * @param {ProcessMessage} data
 */
function send(data: ProcessMessage): void {
    if (process.send) {
        process.send(data);
    }
}
