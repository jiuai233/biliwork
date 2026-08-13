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

    return rows.map(r => ({
        uname: r.uname || '',
        total: Number(r.total_val || 0) / 1000,
        uface: r.uface || ''
    }));
}

export type TrendPoint = { label: string; ts: number; danmaku: number; income: number };

/**
 * 时间段趋势：≤3 天按小时、否则按天，补零到完整时间轴。
 * 业务时区固定 Asia/Shanghai（与采集数据语义一致，不受数据库时区影响）。
 * income = 礼物(r_price*gift_num) + 舰长(price) + SC(rmb*1000)，单位元。
 */
export async function getTrend(roomId: number, startTime: number, endTime: number): Promise<TrendPoint[]> {
    const byHour = endTime - startTime <= 3 * 86_400_000;
    const fmt = byHour ? 'YYYY-MM-DD HH24:00' : 'YYYY-MM-DD';
    const bucketExpr = `to_char(to_timestamp(ts / 1000) AT TIME ZONE 'Asia/Shanghai', ${byHour ? "'YYYY-MM-DD HH24:00'" : "'YYYY-MM-DD'"})`;

    const [danmakuRows, incomeRows] = await Promise.all([
        prisma.$queryRawUnsafe<{ bucket: string, count: bigint }[]>(
            `SELECT ${bucketExpr} AS bucket, COUNT(*) AS count FROM danmaku
             WHERE room_id = $1 AND ts >= $2 AND ts <= $3 GROUP BY bucket`,
            roomId, BigInt(startTime), BigInt(endTime),
        ),
        prisma.$queryRawUnsafe<{ bucket: string, total: bigint }[]>(
            `SELECT bucket, SUM(val) AS total FROM (
                 SELECT ${bucketExpr} AS bucket, (r_price * gift_num) AS val
                 FROM gift WHERE room_id = $1 AND ts >= $2 AND ts <= $3
                 UNION ALL
                 SELECT ${bucketExpr}, price
                 FROM guard WHERE room_id = $1 AND ts >= $2 AND ts <= $3
                 UNION ALL
                 SELECT ${bucketExpr}, rmb * 1000
                 FROM super_chat WHERE room_id = $1 AND ts >= $2 AND ts <= $3
             ) t GROUP BY bucket`,
            roomId, BigInt(startTime), BigInt(endTime),
        ),
    ]);

    const danmakuMap = new Map(danmakuRows.map((r) => [r.bucket, Number(r.count)]));
    const incomeMap = new Map(incomeRows.map((r) => [r.bucket, Number(r.total) / 1000]));

    const stepMs = byHour ? 3_600_000 : 86_400_000;
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmtCursor = (d: Date) => {
        const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        return byHour ? `${date} ${pad(d.getHours())}:00` : date;
    };

    const points: TrendPoint[] = [];
    for (let t = startTime; t <= endTime; t += stepMs) {
        const d = new Date(t);
        const key = fmtCursor(d);
        points.push({
            label: key,
            ts: t,
            danmaku: danmakuMap.get(key) ?? 0,
            income: Math.round((incomeMap.get(key) ?? 0) * 100) / 100,
        });
    }
    return points;
}
