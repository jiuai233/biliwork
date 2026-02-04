import 'server-only';
import { prisma } from '@/lib/db';

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

// 单条盲盒记录
export interface BlindboxRecord {
    id: number;
    uname: string | null;
    uface: string | null;
    gift_name: string | null;
    gift_num: number;
    gift_value: number;      // 礼物价值（电池）
    cost: number;            // 成本（电池）
    profit: number;          // 盈亏（电池）
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
    totalBoxes: number;           // 总开盒次数
    totalCost: number;            // 总投入（电池）
    totalOutput: number;          // 总产出（电池）
    netProfit: number;            // 净盈亏（电池）
    profitRate: number;           // 盈亏率 %
    distribution: GiftDistribution[];  // 礼物分布
    records: BlindboxRecord[];    // 详细记录
}

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
    const where: any = {
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
            id: r.id,
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
    for (const [name, value] of Object.entries(BLINDBOX_GIFTS)) {
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

// 开播记录类型
export interface LiveStatusRecord {
    id: number;
    title: string | null;
    areaName: string | null;
    isStart: boolean;
    ts: number | null;
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
    const where: any = { roomId };

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
        id: r.id,
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

/**
 * 获取带收入的直播场次列表
 */
export async function getLiveSessionsWithIncome(
    roomId: number,
    startTime?: number,
    endTime?: number,
    limit = 50
): Promise<LiveSession[]> {
    const where: any = { roomId };

    if (startTime || endTime) {
        where.ts = {};
        if (startTime) where.ts.gte = BigInt(startTime);
        if (endTime) where.ts.lte = BigInt(endTime);
    }

    // 获取开播记录
    const records = await prisma.liveStatus.findMany({
        where,
        orderBy: { ts: 'desc' },
        take: limit * 2
    });

    // 按时间正序排列便于配对
    const sortedRecords = [...records].sort((a, b) =>
        Number(a.ts || 0) - Number(b.ts || 0)
    );

    // 配对开播和下播
    const sessions: { start: typeof records[0]; end: typeof records[0] | null }[] = [];

    for (let i = 0; i < sortedRecords.length; i++) {
        const record = sortedRecords[i];
        if (record.isStart === 1) {
            // 找下一个下播记录
            let endRecord = null;
            for (let j = i + 1; j < sortedRecords.length; j++) {
                if (sortedRecords[j].isStart === 0) {
                    endRecord = sortedRecords[j];
                    break;
                }
            }
            sessions.push({ start: record, end: endRecord });
        }
    }

    // 倒序（最新的在前）
    sessions.reverse();

    // 为每个场次计算收入
    const result: LiveSession[] = [];

    for (const session of sessions.slice(0, limit)) {
        const startTs = session.start.ts ? Number(session.start.ts) : 0;
        const endTs = session.end?.ts ? Number(session.end.ts) : null;

        // 如果没有下播记录，使用当前时间作为结束
        const queryEndTs = endTs || Date.now();

        // 查询该时间段的收入
        const incomeWhere: any = {
            roomId,
            ts: {
                gte: BigInt(startTs),
                lte: BigInt(queryEndTs)
            }
        };

        const [gifts, guards, scs] = await Promise.all([
            prisma.gift.findMany({ where: incomeWhere, select: { rPrice: true, giftNum: true } }),
            prisma.guard.findMany({ where: incomeWhere, select: { price: true } }),
            prisma.superChat.findMany({ where: incomeWhere, select: { rmb: true } })
        ]);

        // 礼物收入 = sum(r_price * gift_num) / 1000 元
        const giftIncome = gifts.reduce((sum, g) => sum + (g.rPrice * g.giftNum), 0) / 1000;
        // 舰长收入 = sum(price) / 1000 元
        const guardIncome = guards.reduce((sum, g) => sum + g.price, 0) / 1000;
        // SC收入 = rmb 元
        const scIncome = scs.reduce((sum, s) => sum + (s.rmb || 0), 0);
        // 总收入（元）
        const totalIncome = giftIncome + guardIncome + scIncome;

        const duration = endTs ? Math.round((endTs - startTs) / 60000) : 0;

        result.push({
            id: session.start.id,
            startTs,
            endTs,
            duration,
            title: session.start.title,
            areaName: session.start.areaName,
            giftIncome,
            guardIncome,
            scIncome,
            totalIncome
        });
    }

    return result;
}


