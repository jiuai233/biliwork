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
    limit = 200
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
