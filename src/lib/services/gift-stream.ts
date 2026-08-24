import 'server-only';

import { prisma } from '@/lib/db';
import { cookieEncryptionSecret, encryptCookie } from '@/lib/bili-cookie';
import { defaultGiftStreamRange } from '@/lib/gift-stream-range';
import {
    BLINDBOX_COST,
    BLINDBOX_GIFT_NAMES,
    BLINDBOX_GIFTS,
    buildBlindboxStatsFromGiftCounts,
} from '@/lib/services/blindbox';

export type GiftSyncStatus = 'idle' | 'queued' | 'running' | 'done' | 'error';

export type GiftStreamStatusView = {
    bound: boolean;
    boundUid: number | null;
    boundAt: number | null;
    syncStatus: GiftSyncStatus;
    syncError: string | null;
    syncAt: number | null;
    syncFrom: string | null;
    syncTo: string | null;
    syncCursor: string | null;
    queueAhead: number;
    rawCount: number;
    uniqueCount: number;
    hamsterTotal: number;
    batteryTotal: number;
};

function asStatus(value: string | null | undefined): GiftSyncStatus {
    if (value === 'queued' || value === 'running' || value === 'done' || value === 'error') return value;
    return 'idle';
}

export async function getGiftStreamStatus(broadcasterId: number): Promise<GiftStreamStatusView> {
    const session = await prisma.broadcasterBiliSession.findUnique({
        where: { broadcasterId },
    });

    const hamsterRow = await prisma.receivedGift.aggregate({
        where: { broadcasterId },
        _sum: { hamster: true },
        _count: { _all: true },
    });

    const hamsterTotal = hamsterRow._sum.hamster ?? 0;
    const uniqueCount = hamsterRow._count._all;
    const syncStatus = asStatus(session?.syncStatus);
    let queueAhead = 0;
    if (session && syncStatus === 'queued') {
        queueAhead = await prisma.broadcasterBiliSession.count({
            where: {
                OR: [
                    { syncStatus: 'running' },
                    { syncStatus: 'queued', updatedAt: { lt: session.updatedAt } },
                ],
            },
        });
    }

    return {
        bound: Boolean(session),
        boundUid: session ? Number(session.cookieUid) : null,
        boundAt: session ? Number(session.boundAt) : null,
        syncStatus,
        syncError: session?.syncError ?? null,
        syncAt: session?.syncAt ? Number(session.syncAt) : null,
        syncFrom: session?.syncFrom ?? null,
        syncTo: session?.syncTo ?? null,
        syncCursor: session?.syncCursor ?? null,
        queueAhead,
        rawCount: session?.syncRawCount ?? 0,
        uniqueCount,
        hamsterTotal,
        batteryTotal: Math.round(hamsterTotal / 50),
    };
}

export type GiftReportGiftRow = {
    name: string;
    giftId: number;
    num: number;
    hamster: number;
    battery: number;
};

function receivedGiftRangeWhere(broadcasterId: number, startTime?: number, endTime?: number) {
    return {
        broadcasterId,
        ...(startTime || endTime
            ? {
                ts: {
                    ...(startTime ? { gte: BigInt(startTime) } : {}),
                    ...(endTime ? { lte: BigInt(endTime) } : {}),
                },
            }
            : {}),
    };
}

export async function getReceivedGiftBlindboxStats(
    broadcasterId: number,
    startTime?: number,
    endTime?: number,
) {
    const where = {
        ...receivedGiftRangeWhere(broadcasterId, startTime, endTime),
        name: { in: BLINDBOX_GIFT_NAMES },
    };
    const [counts, rows] = await Promise.all([
        prisma.receivedGift.groupBy({
            by: ['name'],
            where,
            _sum: { num: true },
        }),
        prisma.receivedGift.findMany({
            where,
            orderBy: { ts: 'desc' },
            take: 50,
        }),
    ]);

    const records = rows.map((row) => {
        const giftValue = BLINDBOX_GIFTS[row.name] || 0;
        return {
            id: Number(row.id),
            row_key: `received:${row.id}`,
            room_id: row.roomId,
            uname: row.uname,
            uface: null,
            gift_name: row.name,
            gift_num: row.num,
            gift_value: giftValue * row.num,
            cost: BLINDBOX_COST * row.num,
            profit: giftValue * row.num - BLINDBOX_COST * row.num,
            ts: row.ts ? Number(row.ts) : null,
        };
    });

    return buildBlindboxStatsFromGiftCounts(
        counts.map((row) => ({ giftName: row.name, count: row._sum.num ?? 0 })),
        records,
    );
}

export async function getGiftReport(broadcasterId: number, startTime?: number, endTime?: number) {
    const rangeWhere = receivedGiftRangeWhere(broadcasterId, startTime, endTime);
    const [status, byGift, recent, rangeAgg, blindbox] = await Promise.all([
        getGiftStreamStatus(broadcasterId),
        prisma.receivedGift.groupBy({
            by: ['giftId', 'name'],
            where: rangeWhere,
            _sum: { num: true, hamster: true },
        }),
        listReceivedGifts(broadcasterId, 50, startTime, endTime),
        prisma.receivedGift.aggregate({
            where: rangeWhere,
            _sum: { hamster: true },
            _count: { _all: true },
        }),
        getReceivedGiftBlindboxStats(broadcasterId, startTime, endTime),
    ]);

    const hamsterTotal = rangeAgg._sum.hamster ?? 0;
    const gifts: GiftReportGiftRow[] = byGift
        .map((row) => ({
            name: row.name,
            giftId: row.giftId,
            num: row._sum.num ?? 0,
            hamster: row._sum.hamster ?? 0,
            battery: Math.round((row._sum.hamster ?? 0) / 50),
        }))
        .sort((a, b) => b.hamster - a.hamster);

    return {
        status: {
            ...status,
            uniqueCount: rangeAgg._count._all,
            hamsterTotal,
            batteryTotal: Math.round(hamsterTotal / 50),
        },
        gifts,
        recent,
        blindbox,
    };
}

export function formatYmdLabel(value: string | null | undefined): string {
    if (!value || value.length !== 8) return '-';
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export async function buildGiftStreamCsv(
    broadcasterId: number,
    startTime?: number,
    endTime?: number,
): Promise<{ filename: string; csv: string }> {
    const rows = await prisma.receivedGift.findMany({
        where: receivedGiftRangeWhere(broadcasterId, startTime, endTime),
        orderBy: { ts: 'desc' },
    });
    const esc = (value: unknown) => {
        const text = String(value ?? '');
        return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const header = ['收礼时间', '送礼用户UID', '送礼用户昵称', '礼物名称', '礼物ID', '数量', '金仓鼠', '电池', '金额(元)', '直播间ID'];
    const lines = [header.map(esc).join(',')];
    for (const row of rows) {
        lines.push([
            row.time,
            Number(row.uid),
            row.uname ?? '',
            row.name,
            row.giftId,
            row.num,
            row.hamster,
            Math.round(row.hamster / 50),
            (row.hamster / 500).toFixed(1),
            row.roomId,
        ].map(esc).join(','));
    }
    return {
        filename: `gift-report-${broadcasterId}.csv`,
        csv: `\uFEFF${lines.join('\r\n')}`,
    };
}

export async function listReceivedGifts(
    broadcasterId: number,
    take = 200,
    startTime?: number,
    endTime?: number,
) {
    const rows = await prisma.receivedGift.findMany({
        where: receivedGiftRangeWhere(broadcasterId, startTime, endTime),
        orderBy: { ts: 'desc' },
        take,
    });

    return rows.map((row) => ({
        id: Number(row.id),
        time: row.time,
        uname: row.uname,
        uid: Number(row.uid),
        name: row.name,
        giftId: row.giftId,
        num: row.num,
        hamster: row.hamster,
        battery: Math.round(row.hamster / 50),
        receiveTitle: row.receiveTitle,
        roomId: row.roomId,
    }));
}

export async function saveBiliCookie(broadcasterId: number, cookie: string, cookieUid: number): Promise<void> {
    const now = BigInt(Date.now());
    const cookieEnc = encryptCookie(cookie, cookieEncryptionSecret());
    await prisma.broadcasterBiliSession.upsert({
        where: { broadcasterId },
        create: {
            broadcasterId,
            cookieEnc,
            cookieUid: BigInt(cookieUid),
            boundAt: now,
            syncStatus: 'idle',
            createdAt: now,
            updatedAt: now,
        },
        update: {
            cookieEnc,
            cookieUid: BigInt(cookieUid),
            boundAt: now,
            syncError: null,
            updatedAt: now,
        },
    });
}

/** Web only enqueues. Collector picks `queued` serially. */
export async function enqueueGiftStreamSync(broadcasterId: number): Promise<{ ok: boolean; message: string }> {
    const session = await prisma.broadcasterBiliSession.findUnique({ where: { broadcasterId } });
    if (!session) {
        return { ok: false, message: '请先扫码绑定 B 站账号' };
    }
    if (session.syncStatus === 'queued' || session.syncStatus === 'running') {
        return { ok: true, message: '已在采集端队列中' };
    }

    const range = defaultGiftStreamRange();
    const now = BigInt(Date.now());
    await prisma.broadcasterBiliSession.update({
        where: { broadcasterId },
        data: {
            syncStatus: 'queued',
            syncError: null,
            syncCursor: null,
            syncFrom: range.begin,
            syncTo: range.end,
            syncRawCount: 0,
            updatedAt: now,
        },
    });
    return { ok: true, message: '已加入同步队列，采集端会按顺序拉取' };
}

export async function startGiftStreamSync(broadcasterId: number): Promise<{ ok: boolean; message: string }> {
    return enqueueGiftStreamSync(broadcasterId);
}
