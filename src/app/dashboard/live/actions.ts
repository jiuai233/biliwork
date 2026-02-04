'use server';

import { getLiveSessionsWithIncome } from '@/lib/data';
import { requireAuth } from '@/lib/auth';
import { getBroadcasterByUid } from '@/lib/data';

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

