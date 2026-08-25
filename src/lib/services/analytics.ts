import 'server-only';
import { prisma } from '@/lib/db';
import { DashboardStats } from '@/lib/types';

// 获取统计数据 (支持时间段)
export async function getStats(roomId: number, startTime: number, endTime?: number): Promise<DashboardStats> {
    const end = endTime || Date.now();

    const [danmakuCount, giftStats, guardStats, scStats] = await Promise.all([
        prisma.danmaku.count({
            where: {
                roomId,
                ts: { gte: BigInt(startTime), lte: BigInt(end) }
            }
        }),
        prisma.gift.aggregate({
            where: {
                roomId,
                ts: { gte: BigInt(startTime), lte: BigInt(end) }
            },
            _count: true,
            _sum: { rPrice: true, giftNum: true }
        }),
        prisma.guard.aggregate({
            where: {
                roomId,
                ts: { gte: BigInt(startTime), lte: BigInt(end) }
            },
            _count: true,
            _sum: { price: true }
        }),
        prisma.superChat.aggregate({
            where: {
                roomId,
                ts: { gte: BigInt(startTime), lte: BigInt(end) }
            },
            _count: true,
            _sum: { rmb: true }
        })
    ]);

    // Calculate gift total: sum(r_price * gift_num) - need raw query for multiplication
    const giftTotal = await prisma.$queryRaw<[{ total: bigint | null }]>`
        SELECT SUM(r_price * gift_num) as total 
        FROM gift 
        WHERE room_id = ${roomId} AND ts >= ${BigInt(startTime)} AND ts <= ${BigInt(end)}
    `;

    const giftValue = Number(giftTotal[0]?.total || 0) / 1000;
    const guardValue = (guardStats._sum.price || 0) / 1000;
    const scValue = scStats._sum.rmb || 0;

    const totalIncome = giftValue + guardValue + scValue;

    return {
        danmakuCount,
        giftCount: giftStats._count,
        guardCount: guardStats._count,
        scCount: scStats._count,
        totalIncome: Number(totalIncome.toFixed(2))
    };
}

// 获取时间段内弹幕最多的用户
export async function getTopDanmakuUsers(
    roomId: number,
    startTime: number,
    endTime?: number,
    limit = 10
): Promise<{ uname: string, count: number, uface: string }[]> {
    const end = endTime || Date.now();
    const take = Math.min(Math.max(Math.floor(limit), 1), 100);

    const rows = await prisma.$queryRaw<{ uname: string, count: bigint, uface: string }[]>`
        SELECT uname, COUNT(*) as count, MAX(uface) as uface
        FROM danmaku 
        WHERE room_id = ${roomId} AND ts >= ${BigInt(startTime)} AND ts <= ${BigInt(end)}
        GROUP BY uname
        ORDER BY count DESC
        LIMIT ${take}
    `;

    return rows.map(r => ({
        uname: r.uname || '',
        count: Number(r.count),
        uface: r.uface || ''
    }));
}

// 获取时间段内刷礼物最多的用户 (按总价值，包含礼物、舰长和 SC)
export async function getTopGiftUsers(
    roomId: number,
    startTime: number,
    endTime?: number,
    limit = 10
): Promise<{ uname: string, total: number, uface: string }[]> {
    const end = endTime || Date.now();
    const take = Math.min(Math.max(Math.floor(limit), 1), 100);

    const rows = await prisma.$queryRaw<{ uname: string, total_val: bigint, uface: string }[]>`
        SELECT uname, SUM(val) as total_val, MAX(uface) as uface
        FROM (
            SELECT uname, (r_price * gift_num) as val, uface
            FROM gift 
            WHERE room_id = ${roomId} AND ts >= ${BigInt(startTime)} AND ts <= ${BigInt(end)}
            
            UNION ALL
            
            SELECT uname, price as val, uface
            FROM guard 
            WHERE room_id = ${roomId} AND ts >= ${BigInt(startTime)} AND ts <= ${BigInt(end)}
            
            UNION ALL

            SELECT uname, (rmb * 1000) as val, uface
            FROM super_chat
            WHERE room_id = ${roomId} AND ts >= ${BigInt(startTime)} AND ts <= ${BigInt(end)}
        ) combined
        GROUP BY uname
        ORDER BY total_val DESC
        LIMIT ${take}
    `;

    const items = rows.map(r => ({
        uname: r.uname || '',
        total: Number(r.total_val || 0) / 1000,
        uface: r.uface || ''
    }));

    const missingUnames = items.filter(i => !i.uface && i.uname).map(i => i.uname);
    if (missingUnames.length > 0) {
        const danmakuFaces = await prisma.danmaku.findMany({
            where: {
                roomId,
                uname: { in: missingUnames },
                uface: { not: null },
            },
            select: { uname: true, uface: true },
            distinct: ['uname'],
            take: 100,
        });
        const faceMap = new Map<string, string>();
        for (const d of danmakuFaces) {
            if (d.uname && d.uface) faceMap.set(d.uname, d.uface);
        }
        for (const item of items) {
            if (!item.uface && item.uname && faceMap.has(item.uname)) {
                item.uface = faceMap.get(item.uname)!;
            }
        }
    }

    return items;
}
