/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-02
 * @LastEditors: HumXC Hum-XC@outlook.com
 * @LastEditTime: 2022-07-23
 * @FilePath: \QQbot\src\lib\plugin\manager.ts
 * @Description:提供插件的加载，获取等功能
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */
import path from "path";
import fs from "fs";
import { BotPlugin } from "./plugin";
import { Client, util } from "..";
export class PluginManager {
    // 存放插件的目录
    public pluginFolder: string = path.join(require?.main?.path || process.cwd(), "plugins");
    private client: Client;
    public constructor(client: Client) {
        this.client = client;
    }
    public readonly plugins: Map<string, BotPlugin> = new Map<string, BotPlugin>();

    /**
     * @description: 加载 plugins 文件夹下的所有插件类。
     */
    public load(fileNames: string[]) {
        util.mkDirsSync(this.pluginFolder);
        if (fileNames[0] === "ALL") {
            fileNames = [];
            fs.readdirSync(this.pluginFolder).forEach((fileName: string) => {
                let stat = fs.statSync(path.join(this.pluginFolder, fileName));
                if (/\.d\.ts/.exec(fileName) !== null) {
                    return;
                }
                if (stat.isFile()) {
                    if (/\.js$/.exec(fileName) !== null || /\.ts/.exec(fileName)) {
                        fileNames.push(fileName);
                        return;
                    }
                } else {
                    let file = path.join(this.pluginFolder, fileName, "index");
                    if (fs.existsSync(file + ".js") || fs.existsSync(file + ".ts")) {
                        fileNames.push(fileName);
                    }
                }
            });
        }

        for (let i = 0; i < fileNames.length; i++) {
            const pluginPath = path.join(this.pluginFolder, fileNames[i]);

            let basePlugin: any;
            try {
                if (fs.statSync(pluginPath).isDirectory()) {
                    this.client.logger.mark(`正在导入文件夹 [${fileNames[i]}]`);
                    basePlugin = require(path.join(pluginPath, "index"));
                } else {
                    this.client.logger.mark(`正在导入文件 [${fileNames[i]}]`);
                    basePlugin = require(pluginPath);
                }
            } catch (error) {
                this.client.logger.error("导入文件时出现错误，已跳过该插件:", error);
                continue;
            }

            // 解析插件
            if (basePlugin.name === undefined) {
                this.client.logger.error(
                    "插件缺少必须的导出变量 [name:string], 将不会加载此插件。"
                );
                continue;
            }
            if (basePlugin.init === undefined) {
                this.client.logger.error(
                    "插件缺少必须的导出函数 [init:(client)=>void], 将不会加载此插件。"
                );
                continue;
            }
            this.client.logger.mark(`Name: ${basePlugin.name}`);
            if (basePlugin.info) {
                this.client.logger.mark(`Info: ${basePlugin.info}`);
            }
            try {
                let p: BotPlugin = new BotPlugin(this.client, basePlugin);
                this.plugins.set(p.name, p);
            } catch (error) {
                this.client.logger.error("实例化插件错误", error);
            }
        }
    }

    /**
     * @description: 运行 plugin 的 init 函数
     */
    public init() {
        for (const p of this.plugins.values()) {
            p.init.call(p, this.client);
        }
    }
}
