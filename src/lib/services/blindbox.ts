import 'server-only';
import type { LiveStatus as PrismaLiveStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { BlindboxRecord, BlindboxStats, BlindboxStreamerSummary, GiftDistribution, LiveStatusRecord } from '@/lib/types';

// 盲盒成本（电池）——心动盲盒 / 疯五预演
export const BLINDBOX_COST = 150;

/** 心动盲盒内容物，对齐 gift.shuvi.moe/api/blind-gifts id=32251 */
export const BLINDBOX_PRIZES: Record<string, number> = {
    '浪漫城堡': 22330,
    '神驹宝玺': 2000,
    '时空之站': 1000,
    '绮彩权杖': 400,
    '爱心抱枕': 160,
    '棉花糖': 90,
    '电影票': 20,
};

/** 皮肤名 → 本体名（shuvi subGifts） */
export const BLINDBOX_SKINS: Record<string, string> = {
    '蛇形护符': '神驹宝玺',
    '梦幻气球': '电影票',
    '冰晶雪花': '电影票',
    '盛典礼花': '电影票',
    '星星糖': '棉花糖',
    '水晶星星': '棉花糖',
    '星际徽章': '棉花糖',
    '梦境玫瑰': '爱心抱枕',
    '冰晶之球': '爱心抱枕',
    '荣耀皇冠': '爱心抱枕',
    '光辉之星': '绮彩权杖',
};

export function resolveBlindboxPrizeName(name: string | null | undefined): string | null {
    if (!name) return null;
    if (Object.prototype.hasOwnProperty.call(BLINDBOX_PRIZES, name)) return name;
    return BLINDBOX_SKINS[name] ?? null;
}

export function blindboxGiftValue(name: string | null | undefined): number {
    const canonical = resolveBlindboxPrizeName(name);
    return canonical ? BLINDBOX_PRIZES[canonical] : 0;
}

/** 流水匹配用：本体 + 皮肤 → 电池价 */
export const BLINDBOX_GIFTS: Record<string, number> = {
    ...BLINDBOX_PRIZES,
    ...Object.fromEntries(
        Object.entries(BLINDBOX_SKINS).map(([skin, parent]) => [skin, BLINDBOX_PRIZES[parent]]),
    ),
};

export const BLINDBOX_GIFT_NAMES = Object.keys(BLINDBOX_GIFTS);

type GiftCountRow = { giftName: string | null; count: number };

type GiftRecordRow = {
    id: bigint | number;
    roomId: number;
    msgId: string | null;
    uname: string | null;
    uface: string | null;
    giftName: string | null;
    giftNum: number;
    ts: bigint | number | null;
};

function buildGiftWhere(startTime?: number, endTime?: number, username?: string): Prisma.GiftWhereInput {
    const where: Prisma.GiftWhereInput = {
        giftName: { in: BLINDBOX_GIFT_NAMES },
    };

    if (startTime || endTime) {
        where.ts = {};
        if (startTime) where.ts.gte = BigInt(startTime);
        if (endTime) where.ts.lte = BigInt(endTime);
    }

    if (username && username.trim()) {
        where.uname = { contains: username.trim() };
    }

    return where;
}

function roomIdFilter(roomId: number | number[]): number | { in: number[] } | null {
    const roomIds = Array.isArray(roomId) ? roomId : [roomId];
    if (roomIds.length === 0) return null;
    return roomIds.length === 1 ? roomIds[0] : { in: roomIds };
}

export function mapGiftRowsToBlindboxRecords(rows: GiftRecordRow[]): BlindboxRecord[] {
    return rows.map((row) => {
        const giftValue = blindboxGiftValue(row.giftName);
        const cost = BLINDBOX_COST * row.giftNum;
        const sourceId = row.id.toString();

        return {
            id: Number(row.id),
            row_key: row.msgId ? `msg:${row.msgId}` : `gift:${sourceId}`,
            room_id: row.roomId,
            uname: row.uname,
            uface: row.uface,
            gift_name: row.giftName,
            gift_num: row.giftNum,
            gift_value: giftValue * row.giftNum,
            cost,
            profit: (giftValue * row.giftNum) - cost,
            ts: row.ts ? Number(row.ts) : null,
        };
    });
}

export function buildBlindboxStatsFromGiftCounts(
    giftCounts: Iterable<GiftCountRow>,
    records: BlindboxRecord[] = [],
): BlindboxStats {
    const countByName = new Map<string, number>();
    for (const name of Object.keys(BLINDBOX_PRIZES)) {
        countByName.set(name, 0);
    }

    for (const row of giftCounts) {
        const canonical = resolveBlindboxPrizeName(row.giftName);
        if (!canonical) continue;
        countByName.set(canonical, (countByName.get(canonical) ?? 0) + row.count);
    }

    const distribution: GiftDistribution[] = [];
    for (const [name, count] of countByName) {
        const value = BLINDBOX_PRIZES[name];
        distribution.push({
            name,
            count,
            value,
            totalValue: count * value,
            isProfitable: value >= BLINDBOX_COST,
        });
    }

    distribution.sort((a, b) => b.value - a.value);

    const totalBoxes = distribution.reduce((sum, item) => sum + item.count, 0);
    const totalCost = totalBoxes * BLINDBOX_COST;
    const totalOutput = distribution.reduce((sum, item) => sum + item.totalValue, 0);
    const netProfit = totalOutput - totalCost;
    const profitRate = totalCost > 0 ? ((netProfit / totalCost) * 100) : 0;

    return {
        totalBoxes,
        totalCost,
        totalOutput,
        netProfit,
        profitRate,
        distribution,
        records,
    };
}

/**
 * 获取盲盒统计数据。`roomId` 可以是单个房间，或当前收纳的多个房间。
 */
export async function getBlindboxStats(
    roomId: number | number[],
    startTime?: number,
    endTime?: number,
    limit = 200,
    username?: string
): Promise<BlindboxStats> {
    const roomFilter = roomIdFilter(roomId);
    if (roomFilter === null) {
        return buildBlindboxStatsFromGiftCounts([]);
    }

    const where: Prisma.GiftWhereInput = {
        ...buildGiftWhere(startTime, endTime, username),
        roomId: roomFilter,
    };

    const [rows, distributionRows] = await Promise.all([
        prisma.gift.findMany({
            where,
            orderBy: { ts: 'desc' },
            take: limit
        }),
        prisma.gift.groupBy({
            by: ['giftName'],
            where,
            _sum: { giftNum: true }
        })
    ]);

    return buildBlindboxStatsFromGiftCounts(
        distributionRows.map((row) => ({ giftName: row.giftName, count: row._sum.giftNum ?? 0 })),
        mapGiftRowsToBlindboxRecords(rows),
    );
}

export async function getBlindboxStreamerSummaries(
    rooms: { roomId: number; uname: string | null; uface: string | null }[],
    startTime?: number,
    endTime?: number,
    username?: string,
): Promise<BlindboxStreamerSummary[]> {
    if (rooms.length === 0) return [];

    const roomIds = rooms.map((room) => room.roomId);
    const roomFilter = roomIdFilter(roomIds);
    if (roomFilter === null) return [];

    const rows = await prisma.gift.groupBy({
        by: ['roomId', 'giftName'],
        where: {
            ...buildGiftWhere(startTime, endTime, username),
            roomId: roomFilter,
        },
        _sum: { giftNum: true },
    });

    const countsByRoom = new Map<number, GiftCountRow[]>();
    for (const row of rows) {
        const list = countsByRoom.get(row.roomId) ?? [];
        list.push({ giftName: row.giftName, count: row._sum.giftNum ?? 0 });
        countsByRoom.set(row.roomId, list);
    }

    return rooms
        .map((room) => {
            const stats = buildBlindboxStatsFromGiftCounts(countsByRoom.get(room.roomId) ?? []);
            return {
                roomId: room.roomId,
                uname: room.uname,
                uface: room.uface,
                totalBoxes: stats.totalBoxes,
                totalCost: stats.totalCost,
                totalOutput: stats.totalOutput,
                netProfit: stats.netProfit,
                profitRate: stats.profitRate,
            };
        })
        .sort((a, b) => b.totalBoxes - a.totalBoxes || b.netProfit - a.netProfit);
}



/**
 * 获取开播记录
 */
export async function getLiveStatusRecords(
    roomId: number,
    startTime?: number,
    endTime?: number,
    limit = 50
): Promise<LiveStatusRecord[]> {
    const where: Prisma.LiveStatusWhereInput = { roomId };

    if (startTime || endTime) {
        where.ts = {};
        if (startTime) where.ts.gte = BigInt(startTime);
        if (endTime) where.ts.lte = BigInt(endTime);
    }

    const rows = await prisma.liveStatus.findMany({
        where,
        orderBy: { ts: 'desc' },
        take: limit
    });

    return rows.map(r => ({
        id: Number(r.id),
        title: r.title,
        areaName: r.areaName,
        isStart: r.isStart === 1,
        ts: r.ts ? Number(r.ts) : null
    }));
}

// 直播场次（含收入）
export interface LiveSession {
    id: number;
    startTs: number;
    endTs: number | null;
    duration: number;          // 时长（分钟）
    title: string | null;
    areaName: string | null;
    giftIncome: number;        // 礼物收入（电池）
    guardIncome: number;       // 舰长收入（元）
    scIncome: number;          // SC收入（元）
    totalIncome: number;       // 总收入（元）
}

type PairedLiveSession = {
    start: PrismaLiveStatus;
    end: PrismaLiveStatus | null;
    inferredEndTs?: number;
};

const LIVE_SESSION_LOOKBACK_MS = 24 * 60 * 60 * 1000;

/**
 * 获取带收入的直播场次列表
 * 优化：使用单条聚合SQL替代N+1查询
 */
export async function getLiveSessionsWithIncome(
    roomId: number,
    startTime?: number,
    endTime?: number,
    limit = 50
): Promise<LiveSession[]> {
    const start = startTime ?? 0;
    const end = endTime ?? Date.now();
    const queryStart = Math.max(0, start - LIVE_SESSION_LOOKBACK_MS);

    const records = await prisma.liveStatus.findMany({
        where: {
            roomId,
            ts: {
                gte: BigInt(queryStart),
                lte: BigInt(end),
            },
        },
        orderBy: { ts: 'asc' },
    });

    const sessions: PairedLiveSession[] = [];
    let openStart: PrismaLiveStatus | null = null;

    for (const record of records) {
        if (record.isStart === 1) {
            if (openStart) {
                const nextStartTs = record.ts ? Number(record.ts) : Date.now();
                sessions.push({ start: openStart, end: null, inferredEndTs: Math.max(0, nextStartTs - 1000) });
            }
            openStart = record;
            continue;
        }

        if (openStart) {
            sessions.push({ start: openStart, end: record });
            openStart = null;
        }
    }

    if (openStart) {
        sessions.push({ start: openStart, end: null });
    }

    const visibleSessions = sessions
        .filter((session) => {
            const sTs = session.start.ts ? Number(session.start.ts) : 0;
            const eTs = session.end?.ts ? Number(session.end.ts) : session.inferredEndTs ?? Date.now();
            return eTs >= start && sTs <= end;
        })
        .sort((a, b) => Number(b.start.ts || 0) - Number(a.start.ts || 0))
        .slice(0, limit);

    if (visibleSessions.length === 0) return [];

    // 计算整体时间范围，一次性查询所有收入数据
    const overallStart = Math.min(...visibleSessions.map(s => s.start.ts ? Number(s.start.ts) : 0));
    const overallEnd = Math.max(...visibleSessions.map(s => s.end?.ts ? Number(s.end.ts) : s.inferredEndTs ?? Date.now()));

    // 单条SQL查询所有收入（替代N+1）
    const incomeRows = await prisma.$queryRaw<{
        source: string; ts: bigint; value: bigint;
    }[]>`
        SELECT 'gift' as source, ts, (r_price * gift_num) as value
        FROM gift
        WHERE room_id = ${roomId} AND ts >= ${BigInt(overallStart)} AND ts <= ${BigInt(overallEnd)}
        UNION ALL
        SELECT 'guard' as source, ts, price as value
        FROM guard
        WHERE room_id = ${roomId} AND ts >= ${BigInt(overallStart)} AND ts <= ${BigInt(overallEnd)}
        UNION ALL
        SELECT 'sc' as source, ts, (rmb * 1000) as value
        FROM super_chat
        WHERE room_id = ${roomId} AND ts >= ${BigInt(overallStart)} AND ts <= ${BigInt(overallEnd)}
        ORDER BY ts
    `;

    const orderedSessions = [...visibleSessions].sort(
        (a, b) => Number(a.start.ts || 0) - Number(b.start.ts || 0)
    );
    const totals = new Map<PairedLiveSession, { gift: number; guard: number; sc: number }>(
        orderedSessions.map(session => [session, { gift: 0, guard: 0, sc: 0 }])
    );
    let sessionIndex = 0;

    for (const row of incomeRows) {
        const rowTs = Number(row.ts);
        while (sessionIndex < orderedSessions.length) {
            const session = orderedSessions[sessionIndex];
            const endTs = session.end?.ts ? Number(session.end.ts) : session.inferredEndTs ?? Date.now();
            if (rowTs <= endTs) break;
            sessionIndex++;
        }

        const session = orderedSessions[sessionIndex];
        if (!session || rowTs < Number(session.start.ts || 0)) continue;

        const total = totals.get(session)!;
        const value = Number(row.value);
        if (row.source === 'gift') total.gift += value;
        else if (row.source === 'guard') total.guard += value;
        else if (row.source === 'sc') total.sc += value;
    }

    const result: LiveSession[] = visibleSessions.map(session => {
        const sTs = session.start.ts ? Number(session.start.ts) : 0;
        const eTs = session.end?.ts ? Number(session.end.ts) : session.inferredEndTs ?? Date.now();
        const total = totals.get(session)!;
        const giftIncome = total.gift / 1000;
        const guardIncome = total.guard / 1000;
        const scIncome = total.sc / 1000; // SC value 已乘以1000, 除回来
        const totalIncome = giftIncome + guardIncome + scIncome;
        const duration = session.end?.ts ? Math.round((eTs - sTs) / 60000) : 0;

        return {
            id: Number(session.start.id),
            startTs: sTs,
            endTs: session.end?.ts ? Number(session.end.ts) : session.inferredEndTs ?? null,
            duration,
            title: session.start.title,
            areaName: session.start.areaName,
            giftIncome,
            guardIncome,
            scIncome,
            totalIncome
        };
    });

    return result;
}


