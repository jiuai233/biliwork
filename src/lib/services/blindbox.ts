import 'server-only';
import type { LiveStatus as PrismaLiveStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { BlindboxRecord, GiftDistribution, BlindboxStats, LiveStatusRecord } from '@/lib/types';

// 盲盒成本（电池）
export const BLINDBOX_COST = 150;

// 盲盒可开出的礼物及其价值（电池）
export const BLINDBOX_GIFTS: Record<string, number> = {
    '浪漫城堡': 22330,
    '蛇形护符': 2000,
    '时空之站': 1000,
    '绮彩权杖': 400,
    '爱心抱枕': 160,
    '棉花糖': 90,
    '电影票': 20
};

// 所有盲盒礼物名称列表
export const BLINDBOX_GIFT_NAMES = Object.keys(BLINDBOX_GIFTS);


/**
 * 获取盲盒统计数据
 */
export async function getBlindboxStats(
    roomId: number,
    startTime?: number,
    endTime?: number,
    limit = 200,
    username?: string
): Promise<BlindboxStats> {
    const where: Prisma.GiftWhereInput = {
        roomId,
        giftName: { in: BLINDBOX_GIFT_NAMES }
    };

    if (startTime || endTime) {
        where.ts = {};
        if (startTime) where.ts.gte = BigInt(startTime);
        if (endTime) where.ts.lte = BigInt(endTime);
    }

    // 用户名搜索
    if (username && username.trim()) {
        where.uname = { contains: username.trim() };
    }

    const rows = await prisma.gift.findMany({
        where,
        orderBy: { ts: 'desc' },
        take: limit
    });

    // 计算每条记录的盈亏
    const records: BlindboxRecord[] = rows.map(r => {
        const giftValue = BLINDBOX_GIFTS[r.giftName || ''] || 0;
        const cost = BLINDBOX_COST * r.giftNum;
        return {
            id: Number(r.id),
            uname: r.uname,
            uface: r.uface,
            gift_name: r.giftName,
            gift_num: r.giftNum,
            gift_value: giftValue * r.giftNum,
            cost,
            profit: (giftValue * r.giftNum) - cost,
            ts: r.ts ? Number(r.ts) : null
        };
    });

    // 计算总开盒次数（一条记录可能开了多个盒）
    const totalBoxes = records.reduce((sum, r) => sum + r.gift_num, 0);
    const totalCost = totalBoxes * BLINDBOX_COST;
    const totalOutput = records.reduce((sum, r) => sum + r.gift_value, 0);
    const netProfit = totalOutput - totalCost;
    const profitRate = totalCost > 0 ? ((netProfit / totalCost) * 100) : 0;

    // 礼物分布统计
    const distributionMap = new Map<string, { count: number; totalValue: number }>();

    // 初始化所有礼物类型
    for (const name of Object.keys(BLINDBOX_GIFTS)) {
        distributionMap.set(name, { count: 0, totalValue: 0 });
    }

    // 统计每种礼物
    for (const r of records) {
        if (r.gift_name) {
            const existing = distributionMap.get(r.gift_name);
            if (existing) {
                existing.count += r.gift_num;
                existing.totalValue += r.gift_value;
            }
        }
    }

    const distribution: GiftDistribution[] = [];
    for (const [name, data] of distributionMap) {
        const value = BLINDBOX_GIFTS[name];
        distribution.push({
            name,
            count: data.count,
            value,
            totalValue: data.totalValue,
            isProfitable: value >= BLINDBOX_COST
        });
    }

    // 按价值降序排列
    distribution.sort((a, b) => b.value - a.value);

    return {
        totalBoxes,
        totalCost,
        totalOutput,
        netProfit,
        profitRate,
        distribution,
        records
    };
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
    `;

    // 为每个场次分配收入
    const result: LiveSession[] = visibleSessions.map(session => {
        const sTs = session.start.ts ? Number(session.start.ts) : 0;
        const eTs = session.end?.ts ? Number(session.end.ts) : session.inferredEndTs ?? Date.now();

        let giftVal = 0, guardVal = 0, scVal = 0;
        for (const row of incomeRows) {
            const rowTs = Number(row.ts);
            if (rowTs >= sTs && rowTs <= eTs) {
                const val = Number(row.value);
                if (row.source === 'gift') giftVal += val;
                else if (row.source === 'guard') guardVal += val;
                else if (row.source === 'sc') scVal += val;
            }
        }

        const giftIncome = giftVal / 1000;
        const guardIncome = guardVal / 1000;
        const scIncome = scVal / 1000; // SC value 已乘以1000, 除回来
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


