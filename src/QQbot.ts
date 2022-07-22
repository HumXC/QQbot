/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-01
 * @LastEditors: HumXC Hum-XC@outlook.com
 * @LastEditTime: 2022-07-22
 * @FilePath: \QQbot\src\QQbot.ts
 * @Description:应用程序入口，创建和管理所有的账户
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */
import fs from "fs";
import path from "path";
import { Client } from "./lib/index";
import log4js from "log4js";

main();
/** 主进程 */
async function main() {
    const logger = log4js.getLogger("BotFather");
    logger.level = log4js.levels.ALL;
    let config: any = undefined;
    const confpath = path.join(require?.main?.path || process.cwd(), "config.js");

    if (!fs.existsSync(confpath)) {
        fs.copyFileSync(path.join(__dirname, "lib/config.sample.js"), confpath);
        console.log("配置文件不存在，已帮你自动生成，请修改后再次启动程序。");
        return;
    }
    config = require(confpath);
    // 设置日志
    logger.level = config.general.log_level;
    if (config.general.save_log_file === true) {
        log4js.configure({
            appenders: {
                production: {
                    type: "dateFile",
                    filename: "log/bot.log",
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

    // 从配置分离qq号并放入botsis
    let botsid: number[] = [];
    Object.keys(config).forEach((v) => {
        if (v !== "general") {
            botsid.push(Number.parseInt(v));
        }
    });

    // 启动机器人客户端

    for (const qq of botsid) {
        if (qq > 10000 && qq < 0xffffffff) {
            let uid = qq;
            let conf = Object.assign(config.general, config[qq]);
            await startBot(uid, conf);
        } else {
            logger.error(`错误的QQ号:[${qq}],请尝试修改config.js`);
            continue;
        }
    }

    function startBot(uid: number, config: any): Promise<void> {
        return new Promise<void>((resolve) => {
            new Client(uid, config).start().then(() => {
                resolve();
            });
        });
    }
}
