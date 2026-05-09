'use server';

import { getLiveSessionsWithIncome } from '@/lib/data';
import { requireAuth } from '@/lib/auth';
import {
    getBroadcasterByUid,
    getRecentDanmaku,
    getRecentGifts,
    getRecentGuards,
    getRecentSuperChats,
    getStats,
    getTopDanmakuUsers,
    getTopGiftUsers
} from '@/lib/data';

export async function getLiveRecordsData(startTime?: number, endTime?: number) {
    const uid = await requireAuth();
    const broadcaster = await getBroadcasterByUid(uid);

    if (!broadcaster || !broadcaster.room_id) {
        throw new Error('找不到主播信息');
    }

    const roomId = broadcaster.room_id;

    const start = startTime || new Date().setHours(0, 0, 0, 0);
    const end = endTime || Date.now();

    const sessions = await getLiveSessionsWithIncome(roomId, start, end, 50);

    return {
        broadcaster,
        sessions
    };
}

/**
 * 获取单场直播的详细数据
 * 包括：弹幕、礼物明细（按用户聚合）、舰长、SC、统计、排行
 */
export async function getSessionDetail(startTs: number, endTs: number) {
    const uid = await requireAuth();
    const broadcaster = await getBroadcasterByUid(uid);

    if (!broadcaster || !broadcaster.room_id) {
        throw new Error('找不到主播信息');
    }

    const roomId = broadcaster.room_id;

    const [stats, danmaku, gifts, guards, superChats, topDanmaku, topGifts] = await Promise.all([
        getStats(roomId, startTs, endTs),
        getRecentDanmaku(roomId, 200, startTs, endTs),
        getRecentGifts(roomId, 500, startTs, endTs),
        getRecentGuards(roomId, 100, startTs, endTs),
        getRecentSuperChats(roomId, 100, startTs, endTs),
        getTopDanmakuUsers(roomId, startTs, endTs),
        getTopGiftUsers(roomId, startTs, endTs),
    ]);

    // 礼物按用户聚合
    const giftByUser = new Map<string, {
        uname: string;
        uface: string;
        gifts: { name: string; count: number; value: number }[];
        totalValue: number;
    }>();

    for (const g of gifts) {
        const key = g.uname || 'unknown';
        if (!giftByUser.has(key)) {
            giftByUser.set(key, {
                uname: g.uname || '匿名',
                uface: g.uface || '',
                gifts: [],
                totalValue: 0,
            });
        }
        const user = giftByUser.get(key)!;
        const existing = user.gifts.find(x => x.name === g.gift_name);
        const giftValue = (g.r_price * g.gift_num) / 1000;
        if (existing) {
            existing.count += g.gift_num;
            existing.value += giftValue;
        } else {
            user.gifts.push({
                name: g.gift_name || '未知礼物',
                count: g.gift_num,
                value: giftValue,
            });
        }
        user.totalValue += giftValue;
    }

    const giftUsers = Array.from(giftByUser.values())
        .sort((a, b) => b.totalValue - a.totalValue);

    return {
        broadcaster,
        stats,
        danmakuCount: danmaku.length,
        danmakuList: danmaku.slice(0, 50), // 只返回最近50条弹幕
        giftUsers,
        guards: guards.map(g => ({
            uname: g.uname || '匿名',
            uface: g.uface || '',
            guardLevel: g.guard_level,
            guardNum: g.guard_num,
            price: g.price / 1000,
            ts: g.ts,
        })),
        superChats: superChats.map(sc => ({
            uname: sc.uname || '匿名',
            uface: sc.uface || '',
            message: sc.message || '',
            rmb: sc.rmb,
            ts: sc.ts,
        })),
        topDanmaku,
        topGifts,
    };
}
