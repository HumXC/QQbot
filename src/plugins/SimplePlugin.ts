/*
 * @Author: HumXC hum-xc@outlook.com
 * @Date: 2022-06-09
 * @LastEditors: HumXC hum-xc@outlook.com
 * @LastEditTime: 2022-06-10
 * @FilePath: \QQbot\src\plugins\SimplePlugin.ts
 * @Description: 这是示例插件，包含
 *
 * Copyright (c) 2022 by HumXC hum-xc@outlook.com, All Rights Reserved.
 */

import { BotPlugin, Client } from "../lib/index";

export let profile = {
    name: "testPlugin",
    botVersion: "0.0.1",
    pluginVersion: "0.0.1",
    info: "测试用的插件",
    Name: "",
    jack: "",
};

export class Plugin {
    private basePlugin: BotPlugin;
    constructor(client: Client) {}

    public init() {
        let a = "";

        if (a == "") console.log();
        (a: any) => {};
        let b = a === "d" ? "" : "";

        this.basePlugin.regCommand(
            "global",
            "allow_all",
            "test",
            "这是命令提示",
            async (msg, ...args) => {
                return true;
            }
        );
    }
}
