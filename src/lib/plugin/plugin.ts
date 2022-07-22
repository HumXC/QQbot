/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-02
 * @LastEditors: HumXC Hum-XC@outlook.com
 * @LastEditTime: 2022-07-22
 * @FilePath: \QQbot\src\lib\plugin\plugin.ts
 * @Description: 插件类，所有插件应当继承此类。
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */

import * as log4js from "log4js";
import { LogLevel } from "oicq";
import { Client } from "../client";

export type Logger = {
    debug: (message: any, ...args: any[]) => void;
    error: (message: any, ...args: any[]) => void;
    fatal: (message: any, ...args: any[]) => void;
    info: (message: any, ...args: any[]) => void;
    mark: (message: any, ...args: any[]) => void;
    trace: (message: any, ...args: any[]) => void;
    warn: (message: any, ...args: any[]) => void;
};
type BasePlugin = {
    name: string;
    init: (client: Client) => void;
    logger?: PluginLogger;
    info?: string;
};
export interface BotPluginProfile {
    /** 插件名称 */
    Name: string;
    /** 机器人客户端版本 */
    BotVersion: string;
    /** 插件版本 */
    PluginVersion: string;
    /** 描述信息 */
    Info: string;
}
export type BotPluginClass = { new (client: Client, profile: BotPluginProfile): BotPlugin };
export type BotPluginProfileClass = { new (): BotPluginProfile };
/**
 * @description: 插件的实现类，插件被加载之后通过此类实例化
 */
export class BotPlugin {
    // 机器人客户端
    public logger: PluginLogger;
    public name: string;
    public init: (client: Client) => void;
    public info?: string;
    constructor(client: Client, basePlugin: BasePlugin) {
        this.name = basePlugin.name;
        this.init = basePlugin.init;
        this.info = basePlugin.info;
        this.logger = new PluginLogger(client, basePlugin.name);
        if (basePlugin.logger) {
            basePlugin.logger = this.logger;
        }
    }
}

/**
 * @description: 经过修改的日志器, 用于实现error_call_admin
 */
class PluginLogger {
    private logger: log4js.Logger;
    private client: Client;
    private pluginName: string;
    public debug(message: any, ...args: any[]) {
        this.logger.debug(message, ...args);
    }
    public error(message: any, ...args: any[]) {
        this.logger.error(message, ...args);
    }
    public fatal(message: any, ...args: any[]) {
        this.logger.fatal(message, ...args);
    }
    public info(message: any, ...args: any[]) {
        this.logger.info(message, ...args);
    }
    public mark(message: any, ...args: any[]) {
        this.logger.mark(message, ...args);
    }
    public trace(message: any, ...args: any[]) {
        this.logger.trace(message, ...args);
    }
    public warn(message: any, ...args: any[]) {
        this.logger.warn(message, ...args);
    }
    constructor(client: Client, pluginName: string) {
        this.pluginName = pluginName;
        this.client = client;
        this.logger = log4js.getLogger(
            `[${this.client.oicq.apk.display}:${this.client.oicq.uin}] [${pluginName}]`
        );
        this.logger.level = this.client.config.log_level as LogLevel;
        if (this.client.config.error_call_admin === true) {
            this.error = (message: any, ...args: any[]) => {
                // this.logger.error("测试错误", "啊对对对", new Error("error"));
                this.logger.error(message, ...args);
                let msgs: string[] = [];
                if (message.message !== undefined) {
                    msgs.push("\n" + message.message);
                } else if (message.toString !== undefined) {
                    msgs.push("\n" + message.toString());
                }
                for (let i = 0; i < args.length; i++) {
                    if (args[i].message !== undefined) {
                        msgs.push("\n" + args[i].message);
                        continue;
                    }
                    if (args[i].toString !== undefined) {
                        msgs.push("\n" + args[i].toString());
                        continue;
                    }
                }
                this.client.callAdmin(`有插件出现错误\n${this.pluginName}`, ...msgs);
            };
        }
    }
}

export type UserType = "Person" | "Group";

/** 插件用户接口，可以扩展此接口实现更多功能 */
export interface PluginUser {
    uid: number;
    type: UserType;
}
