/*
 * @Author: HumXC Hum-XC@outlook.com
 * @Date: 2022-06-03
 * @LastEditors: HumXC Hum-XC@outlook.com
 * @LastEditTime: 2022-07-22
 * @FilePath: \QQbot\src\lib\message\manager.ts
 * @Description: 消息处理器，通过监听 oicq 的 message 事件来给机器人客户端提供消息相关的功能。
 *
 * Copyright (c) 2022 by HumXC Hum-XC@outlook.com, All Rights Reserved.
 */

import { PrivateMessageEvent, GroupMessageEvent, DiscussMessageEvent } from "oicq";
import { Client } from "../client";
import { BotPlugin } from "../plugin/plugin";
import { getMsgFilter, MsgFilter, MsgFilterPre } from "./filter";

/**
 * @description: 消息的接收范围
 */
export type MsgArea = "global" | "private" | "group";

export type MsgHandler = (
    /** 需要处理的消息 */
    message: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent
) => void;

export type MsgTrigger = {
    /** 触发的范围 */
    area: MsgArea;
    /** 用于过滤消息的过滤器 */
    filter: MsgFilter;
    /** 用于匹配消息的文本 */
    regexp: RegExp;
    /** 满足过滤和匹配后运行的函数 */
    handler: MsgHandler;
    /** 调用 handler 的插件对象，被用于 handler.call() */
    plugin: BotPlugin;
};

export class MessageManager {
    private client: Client;
    public static msgFilters: { [key in MsgFilterPre]: MsgFilter };
    constructor(client: Client) {
        this.client = client;
        MessageManager.msgFilters = {
            allow_all: getMsgFilter("allow_all"),
            atme: getMsgFilter("atme"),
            bot_admin: getMsgFilter("bot_admin")(client),
            friend: getMsgFilter("friend")(client),
            group_admin: getMsgFilter("group_admin"),
            group_member: getMsgFilter("group_member"),
            group_owner: getMsgFilter("group_owner"),
        };

        // 监听群聊消息
        this.client.oicq.on("message.group", (message) => {
            if (MessageManager.msgFilters.bot_admin(message)) {
                client.em("admin.message.group", message);
            }
        });

        // 监听私聊消息
        this.client.oicq.on("message.private", (message) => {
            if (MessageManager.msgFilters.bot_admin(message)) {
                client.em("admin.message.private", message);
            }
        });
    }
}
