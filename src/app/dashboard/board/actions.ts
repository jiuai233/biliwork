'use server';

import { requireAuth } from '@/lib/auth';
import { getBroadcasterByUid, getUnifiedTransactions } from '@/lib/data';

export async function getRecentBoardTransactions() {
    const uid = await requireAuth();
    const broadcaster = await getBroadcasterByUid(uid);

    if (!broadcaster?.room_id) {
        throw new Error('找不到主播信息');
    }

    return getUnifiedTransactions(broadcaster.room_id, 500);
}

export async function getBoardTransactionsForSession(startTs: number, endTs?: number | null) {
    const uid = await requireAuth();
    const broadcaster = await getBroadcasterByUid(uid);

    if (!broadcaster?.room_id) {
        throw new Error('找不到主播信息');
    }

    if (!Number.isFinite(startTs) || startTs <= 0) {
        throw new Error('无效的场次开始时间');
    }

    const safeEndTs = endTs && Number.isFinite(endTs) ? endTs : Date.now();

    return getUnifiedTransactions(broadcaster.room_id, {
        startTime: startTs,
        endTime: safeEndTs,
        limit: 500,
    });
}
