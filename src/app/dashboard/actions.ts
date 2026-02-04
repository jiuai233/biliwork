'use server';

import {
    getStats,
    getRecentDanmaku,
    getRecentGifts,
    getRecentGuards,
    getRecentSuperChats,
    getBroadcasterByUid,
    getTopDanmakuUsers,
    getTopGiftUsers
} from '@/lib/data';
import { requireAuth } from '@/lib/auth';

// 验证用户并获取当前直播间数据
export async function getDashboardData(startTime?: number, endTime?: number) {
    const uid = await requireAuth();
    const broadcaster = await getBroadcasterByUid(uid);

    if (!broadcaster || !broadcaster.room_id) {
        throw new Error('找不到主播信息');
    }

    const roomId = broadcaster.room_id;

    // 如果未提供时间，默认取今日
    const start = startTime || new Date().setHours(0, 0, 0, 0);
    const end = endTime || Date.now();

    // 并行获取所有数据 (all functions are now async)
    const [stats, danmaku, gifts, guards, superChats, topDanmaku, topGifts] = await Promise.all([
        getStats(roomId, start, end),
        getRecentDanmaku(roomId, 50, start, end),
        getRecentGifts(roomId, 50, start, end),
        getRecentGuards(roomId, 20, start, end),
        getRecentSuperChats(roomId, 20, start, end),
        getTopDanmakuUsers(roomId, start, end),
        getTopGiftUsers(roomId, start, end)
    ]);

    return {
        broadcaster,
        stats,
        danmaku,
        gifts,
        guards,
        superChats,
        topDanmaku,
        topGifts
    };
}
