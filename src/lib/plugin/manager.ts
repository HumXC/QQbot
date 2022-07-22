/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-02
 * @LastEditors: HumXC Hum-XC@outlook.com
 * @LastEditTime: 2022-07-22
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
    public load() {
        util.mkDirsSync(this.pluginFolder);
        this.client.logger.mark("====== 准备插件 ======");
        // 插件文件的存放相对路径，相对与 "plugins" 文件夹
        let pluginsFilePath: string[] = [];
        if (!fs.existsSync(this.pluginFolder)) {
            fs.mkdirSync(this.pluginFolder);
        }
        // 加载插件目录下所有 js ts 文件
        fs.readdirSync(this.pluginFolder).forEach((fileName: string) => {
            let stat = fs.lstatSync(path.join(this.pluginFolder, fileName));
            if (/\.d\.ts/.exec(fileName) !== null) {
                return;
            }
            if (stat.isFile()) {
                if (/\.js$/.exec(fileName) !== null || /\.ts/.exec(fileName)) {
                    pluginsFilePath.push(fileName);
                    return;
                }
            } else {
                // 如果是文件夹，则加载文件夹下的 index.ts/index.js 文件
                let file = path.join(this.pluginFolder, fileName, "index");
                if (fs.existsSync(file + ".js") || fs.existsSync(file + ".ts")) {
                    pluginsFilePath.push(path.join(fileName, "index"));
                }
            }
        });
        for (let i = 0; i < pluginsFilePath.length; i++) {
            const pluginPath = pluginsFilePath[i];
            this.client.logger.mark(`正在导入插件 [${pluginPath}]`);
            let basePlugin: any;
            try {
                basePlugin = require(path.join(this.pluginFolder, pluginPath));
            } catch (error) {
                this.client.logger.error("导入插件时出现错误，已跳过该插件:", error);
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

            try {
                let p: BotPlugin = new BotPlugin(this.client, basePlugin);
                this.plugins.set(p.name, p);
                if (p.info) {
                    this.client.logger.mark(`Info: ${p.info}`);
                }
            } catch (error) {
                this.client.logger.error("实例化插件错误", error);
            }
            this.client.logger.mark("=====================");
        }
    }
}
