
export interface Broadcaster {
    id: number;
    auth_code: string;
    room_id: number | null;
    uid: number | null;
    uname: string | null;
    uface: string | null;
    open_id: string | null;
    room_name: string | null;
    active: number;
    password_hash?: string | null;
    created_at: number;
    updated_at: number;
}

export interface Danmaku {
    id: number;
    room_id: number;
    open_id: string | null;
    uname: string | null;
    uface: string | null;
    msg: string | null;
    msg_id: string | null;
    dm_type: number;
    emoji_img_url: string | null;
    fans_medal_level: number;
    fans_medal_name: string | null;
    guard_level: number;
    ts: number | null;
    created_at: Date;
}

export interface Gift {
    id: number;
    room_id: number;
    open_id: string | null;
    uname: string | null;
    uface: string | null;
    gift_id: number | null;
    gift_name: string | null;
    gift_num: number;
    gift_icon: string | null;
    price: number;
    r_price: number;
    paid: number;
    fans_medal_level: number;
    fans_medal_name: string | null;
    guard_level: number;
    msg_id: string | null;
    ts: number | null;
    created_at: Date;
}

export interface Guard {
    id: number;
    room_id: number;
    open_id: string | null;
    uname: string | null;
    uface: string | null;
    guard_level: number | null;
    guard_num: number;
    guard_unit: string | null;
    price: number;
    fans_medal_level: number;
    fans_medal_name: string | null;
    msg_id: string | null;
    ts: number | null;
    created_at: Date;
}

export interface SuperChat {
    id: number;
    room_id: number;
    open_id: string | null;
    uname: string | null;
    uface: string | null;
    message_id: number | null;
    message: string | null;
    rmb: number;
    start_time: number | null;
    end_time: number | null;
    guard_level: number;
    fans_medal_level: number;
    fans_medal_name: string | null;
    msg_id: string | null;
    ts: number | null;
    created_at: Date;
}

export interface DashboardStats {
    danmakuCount: number;
    giftCount: number;
    guardCount: number;
    scCount: number;
    totalIncome: number; // 估算的总收入 (礼物+舰长+SC)
}

// 盲盒成本（电池）
export const BLINDBOX_COST = 150;

// 单条盲盒记录
export interface BlindboxRecord {
    id: number;
    uname: string | null;
    uface: string | null;
    gift_name: string | null;
    gift_num: number;
    gift_value: number;
    cost: number;
    profit: number;
    ts: number | null;
}

// 礼物分布统计
export interface GiftDistribution {
    name: string;
    count: number;
    value: number;
    totalValue: number;
    isProfitable: boolean;
}

// 盲盒统计结果
export interface BlindboxStats {
    totalBoxes: number;
    totalCost: number;
    totalOutput: number;
    netProfit: number;
    profitRate: number;
    distribution: GiftDistribution[];
    records: BlindboxRecord[];
}
