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

// 获取趋势数据 (简单的24小时趋势，用于图表)
export async function getDanmakuTrend(roomId: number): Promise<{ time: string, count: number }[]> {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    // Use raw query for time grouping (PostgreSQL specific)
    const rows = await prisma.$queryRaw<{ time: string, count: bigint }[]>`
        SELECT 
            to_char(to_timestamp(ts / 1000), 'HH24:00') as time,
            COUNT(*) as count
        FROM danmaku 
        WHERE room_id = ${roomId} AND ts > ${BigInt(oneDayAgo)}
        GROUP BY time
        ORDER BY MIN(ts) ASC
    `;

    return rows.map(r => ({
        time: r.time,
        count: Number(r.count)
    }));
}

// 获取时间段内弹幕最多的用户 Top 3
export async function getTopDanmakuUsers(roomId: number, startTime: number, endTime?: number): Promise<{ uname: string, count: number, uface: string }[]> {
    const end = endTime || Date.now();

    const rows = await prisma.$queryRaw<{ uname: string, count: bigint, uface: string }[]>`
        SELECT uname, COUNT(*) as count, MAX(uface) as uface
        FROM danmaku 
        WHERE room_id = ${roomId} AND ts >= ${BigInt(startTime)} AND ts <= ${BigInt(end)}
        GROUP BY uname
        ORDER BY count DESC
        LIMIT 3
    `;

    return rows.map(r => ({
        uname: r.uname || '',
        count: Number(r.count),
        uface: r.uface || ''
    }));
}

// 获取时间段内刷礼物最多的用户 Top 3 (按总价值，包含礼物和舰长)
export async function getTopGiftUsers(roomId: number, startTime: number, endTime?: number): Promise<{ uname: string, total: number, uface: string }[]> {
    const end = endTime || Date.now();

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
        LIMIT 3
    `;

    return rows.map(r => ({
        uname: r.uname || '',
        total: Number(r.total_val || 0) / 1000,
        uface: r.uface || ''
    }));
}
