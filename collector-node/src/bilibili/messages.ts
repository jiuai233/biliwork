export interface DanmakuMessage {
    roomId: number;
    openId: string;
    uname: string;
    uface: string;
    msg: string;
    msgId: string;
    dmType: number;
    emojiImgUrl: string;
    fansMedalLevel: number;
    fansMedalName: string;
    guardLevel: number;
    timestamp: number;
}

export interface GiftMessage {
    roomId: number;
    openId: string;
    uname: string;
    uface: string;
    giftId: number;
    giftName: string;
    giftNum: number;
    giftIcon: string;
    price: number;
    rPrice: number;
    paid: boolean;
    fansMedalLevel: number;
    fansMedalName: string;
    guardLevel: number;
    msgId: string;
    timestamp: number;
}

export interface GuardMessage {
    roomId: number;
    openId: string;
    uname: string;
    uface: string;
    guardLevel: number;
    guardNum: number;
    guardUnit: string;
    price: number;
    fansMedalLevel: number;
    fansMedalName: string;
    msgId: string;
    timestamp: number;
}

export interface SuperChatMessage {
    roomId: number;
    openId: string;
    uname: string;
    uface: string;
    messageId: number;
    message: string;
    rmb: number;
    startTime: number;
    endTime: number;
    guardLevel: number;
    fansMedalLevel: number;
    fansMedalName: string;
    msgId: string;
    timestamp: number;
}

export interface LiveStatusMessage {
    roomId: number;
    title: string;
    areaName: string;
    isStart: boolean;
    timestamp: number;
}

function getString(data: Record<string, unknown>, key: string) {
    const value = data[key];
    return typeof value === 'string' ? value : '';
}

function getNumber(data: Record<string, unknown>, key: string) {
    const value = data[key];
    return typeof value === 'number' ? value : 0;
}

function getBool(data: Record<string, unknown>, key: string) {
    const value = data[key];
    return typeof value === 'boolean' ? value : false;
}

export function parseDanmaku(data: Record<string, unknown>): DanmakuMessage {
    return {
        roomId: getNumber(data, 'room_id'),
        openId: getString(data, 'open_id'),
        uname: getString(data, 'uname'),
        uface: getString(data, 'uface'),
        msg: getString(data, 'msg'),
        msgId: getString(data, 'msg_id'),
        dmType: getNumber(data, 'dm_type'),
        emojiImgUrl: getString(data, 'emoji_img_url'),
        fansMedalLevel: getNumber(data, 'fans_medal_level'),
        fansMedalName: getString(data, 'fans_medal_name'),
        guardLevel: getNumber(data, 'guard_level'),
        timestamp: getNumber(data, 'timestamp'),
    };
}

export function parseGift(data: Record<string, unknown>): GiftMessage {
    return {
        roomId: getNumber(data, 'room_id'),
        openId: getString(data, 'open_id'),
        uname: getString(data, 'uname'),
        uface: getString(data, 'uface'),
        giftId: getNumber(data, 'gift_id'),
        giftName: getString(data, 'gift_name'),
        giftNum: getNumber(data, 'gift_num'),
        giftIcon: getString(data, 'gift_icon'),
        price: getNumber(data, 'price'),
        rPrice: getNumber(data, 'r_price'),
        paid: getBool(data, 'paid'),
        fansMedalLevel: getNumber(data, 'fans_medal_level'),
        fansMedalName: getString(data, 'fans_medal_name'),
        guardLevel: getNumber(data, 'guard_level'),
        msgId: getString(data, 'msg_id'),
        timestamp: getNumber(data, 'timestamp'),
    };
}

export function parseGuard(data: Record<string, unknown>): GuardMessage {
    return {
        roomId: getNumber(data, 'room_id'),
        openId: getString(data, 'open_id'),
        uname: getString(data, 'uname'),
        uface: getString(data, 'uface'),
        guardLevel: getNumber(data, 'guard_level'),
        guardNum: getNumber(data, 'guard_num'),
        guardUnit: getString(data, 'guard_unit'),
        price: getNumber(data, 'price'),
        fansMedalLevel: getNumber(data, 'fans_medal_level'),
        fansMedalName: getString(data, 'fans_medal_name'),
        msgId: getString(data, 'msg_id'),
        timestamp: getNumber(data, 'timestamp'),
    };
}

export function parseSuperChat(data: Record<string, unknown>): SuperChatMessage {
    return {
        roomId: getNumber(data, 'room_id'),
        openId: getString(data, 'open_id'),
        uname: getString(data, 'uname'),
        uface: getString(data, 'uface'),
        messageId: getNumber(data, 'message_id'),
        message: getString(data, 'message'),
        rmb: getNumber(data, 'rmb'),
        startTime: getNumber(data, 'start_time'),
        endTime: getNumber(data, 'end_time'),
        guardLevel: getNumber(data, 'guard_level'),
        fansMedalLevel: getNumber(data, 'fans_medal_level'),
        fansMedalName: getString(data, 'fans_medal_name'),
        msgId: getString(data, 'msg_id'),
        timestamp: getNumber(data, 'timestamp'),
    };
}

export function parseLiveStatus(data: Record<string, unknown>, isStart: boolean): LiveStatusMessage {
    return {
        roomId: getNumber(data, 'room_id'),
        title: getString(data, 'title'),
        areaName: getString(data, 'area_name'),
        isStart,
        timestamp: getNumber(data, 'timestamp'),
    };
}
