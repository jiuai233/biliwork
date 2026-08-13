import 'server-only';
import { prisma } from '@/lib/db';
import { getLiveSessionsWithIncome } from '@/lib/services/blindbox';
import { getTopGiftUsers } from '@/lib/services/analytics';
import { getUnifiedTransactions, type Transaction } from '@/lib/services/transactions';

export interface WeekIncome {
    totalIncome: number;
    giftIncome: number;
    guardIncome: number;
    scIncome: number;
    giftCount: number;
    guardCount: number;
    scCount: number;
    danmakuCount: number;
}

export interface WeeklyReport {
    weekStart: number; // 周一 00:00（本地）
    weekEnd: number;   // 周日 23:59:59.999
    stats: WeekIncome & { sessionCount: number; durationMin: number };
    prevStats: WeekIncome | null;
    prevSessionCount: number;
    daily: { ts: number; income: number }[];
    topGifts: { uname: string; total: number; uface: string }[];
    sessions: Awaited<ReturnType<typeof getLiveSessionsWithIncome>>;
    highlights: Transaction[];
}

/** 一周收入分项 + 各互动计数（不含场次）。 */
async function getWeekIncome(roomId: number, start: number, end: number): Promise<WeekIncome> {
    const rows = await prisma.$queryRaw<{ type: string; cnt: number; total: bigint }[]>`
        SELECT 'gift' AS type, COUNT(*)::int AS cnt, COALESCE(SUM(r_price * gift_num), 0) AS total
        FROM gift WHERE room_id = ${roomId} AND ts >= ${BigInt(start)} AND ts <= ${BigInt(end)}
        UNION ALL
        SELECT 'guard', COUNT(*)::int, COALESCE(SUM(price), 0)
        FROM guard WHERE room_id = ${roomId} AND ts >= ${BigInt(start)} AND ts <= ${BigInt(end)}
        UNION ALL
        SELECT 'sc', COUNT(*)::int, COALESCE(SUM(rmb * 1000), 0)
        FROM super_chat WHERE room_id = ${roomId} AND ts >= ${BigInt(start)} AND ts <= ${BigInt(end)}`;

    const byType = new Map(rows.map((r) => [r.type, r]));
    const gift = byType.get('gift');
    const guard = byType.get('guard');
    const sc = byType.get('sc');

    const giftIncome = Number(gift?.total ?? BigInt(0)) / 1000;
    const guardIncome = Number(guard?.total ?? BigInt(0)) / 1000;
    const scIncome = Number(sc?.total ?? BigInt(0)) / 1000;
    const danmakuCount = await prisma.danmaku.count({
        where: { roomId, ts: { gte: BigInt(start), lte: BigInt(end) } },
    });

    return {
        totalIncome: giftIncome + guardIncome + scIncome,
        giftIncome,
        guardIncome,
        scIncome,
        giftCount: gift?.cnt ?? 0,
        guardCount: guard?.cnt ?? 0,
        scCount: sc?.cnt ?? 0,
        danmakuCount,
    };
}

/** 7 天每日营收（Asia/Shanghai 分组，补零）。 */
async function getDailyIncome(roomId: number, start: number, end: number): Promise<{ ts: number; income: number }[]> {
    const rows = await prisma.$queryRaw<{ bucket: string; total: bigint }[]>`
        SELECT bucket, SUM(val) AS total FROM (
            SELECT to_char(to_timestamp(ts / 1000) AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD') AS bucket, (r_price * gift_num) AS val
            FROM gift WHERE room_id = ${roomId} AND ts >= ${BigInt(start)} AND ts <= ${BigInt(end)}
            UNION ALL
            SELECT to_char(to_timestamp(ts / 1000) AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD'), price
            FROM guard WHERE room_id = ${roomId} AND ts >= ${BigInt(start)} AND ts <= ${BigInt(end)}
            UNION ALL
            SELECT to_char(to_timestamp(ts / 1000) AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD'), rmb * 1000
            FROM super_chat WHERE room_id = ${roomId} AND ts >= ${BigInt(start)} AND ts <= ${BigInt(end)}
        ) t GROUP BY bucket`;

    const map = new Map(rows.map((r) => [r.bucket, Number(r.total) / 1000]));
    const pad = (n: number) => String(n).padStart(2, '0');
    const out: { ts: number; income: number }[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(start + i * 86_400_000);
        const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        out.push({ ts: start + i * 86_400_000, income: Math.round((map.get(key) ?? 0) * 100) / 100 });
    }
    return out;
}

/** 一周复盘：收入/互动/场次/金主/高光 + 上一周环比基准。weekStart 为周一 00:00（本地）。 */
export async function getWeeklyReport(roomId: number, weekStart: number): Promise<WeeklyReport> {
    const weekEnd = weekStart + 7 * 86_400_000 - 1;
    const prevStart = weekStart - 7 * 86_400_000;
    const prevEnd = weekStart - 1;

    const [income, prevIncome, prevSessionCount, daily, topGifts, sessions, transactions] = await Promise.all([
        getWeekIncome(roomId, weekStart, weekEnd),
        getWeekIncome(roomId, prevStart, prevEnd),
        prisma.liveStatus.count({
            where: { roomId, isStart: 1, ts: { gte: BigInt(prevStart), lte: BigInt(prevEnd) } },
        }),
        getDailyIncome(roomId, weekStart, weekEnd),
        getTopGiftUsers(roomId, weekStart, weekEnd, 10),
        getLiveSessionsWithIncome(roomId, weekStart, weekEnd, 500),
        getUnifiedTransactions(roomId, { startTime: weekStart, endTime: weekEnd, limit: 200 }),
    ]);

    return {
        weekStart,
        weekEnd,
        stats: {
            ...income,
            sessionCount: sessions.length,
            durationMin: sessions.reduce((sum, s) => sum + s.duration, 0),
        },
        prevStats: prevIncome,
        prevSessionCount,
        daily,
        topGifts,
        sessions,
        highlights: transactions.filter((t) => t.type !== 'gift' || t.price >= 30),
    };
}
