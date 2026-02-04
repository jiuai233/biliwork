'use server';

import { getBlindboxStats } from '@/lib/data';
import { requireAuth } from '@/lib/auth';
import { getBroadcasterByUid } from '@/lib/data';

export async function getBlindboxData(startTime?: number, endTime?: number) {
    const uid = await requireAuth();
    const broadcaster = await getBroadcasterByUid(uid);

    if (!broadcaster || !broadcaster.room_id) {
        throw new Error('找不到主播信息');
    }

    const roomId = broadcaster.room_id;

    // 如果未提供时间，默认取今日
    const start = startTime || new Date().setHours(0, 0, 0, 0);
    const end = endTime || Date.now();

    const stats = await getBlindboxStats(roomId, start, end);

    return {
        broadcaster,
        stats
    };
}
