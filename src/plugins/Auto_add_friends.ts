/*
 * @Author: HumXC hum-xc@outlook.com
 * @Date: 2022-06-08
 * @LastEditors: HumXC hum-xc@outlook.com
 * @LastEditTime: 2022-06-08
 * @FilePath: \QQbot\src\plugins\Auto_add_friends.ts
 * @Description: 从旧版机器人移植的插件，用于自动添加好友
 *
 * Copyright (c) 2022 by HumXC hum-xc@outlook.com, All Rights Reserved.
 */
import { FriendRequestEvent } from "oicq";
import { BotPlugin, BotPluginProfile } from "../lib/index";
export class Profile implements BotPluginProfile {
    Name: string = "AutoAddFriend";
    BotVersion: string = "0.1.1";
    PluginVersion: string = "0.0.1";
    Info: string = "自动添加好友";
}

export class Plugin extends BotPlugin {
    public init() {
        this.client.oicq.on("request.friend.single", async (event: FriendRequestEvent) => {
            this.addFriend(event);
        });
        this.client.on("request.friend.add", async (event: FriendRequestEvent) => {
            this.addFriend(event);
        });
    }
    async addFriend(event: FriendRequestEvent) {
        await sleep(5000);
        let result = false;
        try {
            result = await this.client.oicq.pickFriend(event.user_id).addFriendBack(event.seq);
        } catch (error) {
            this.logger.error(error);
        }
        this.logger.info(`自动添加 [${event.user_id}] 为好友: ${result ? "成功" : "失败"}`);
    }
}
async function sleep(time: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        setTimeout(() => resolve(), time);
    });
}
