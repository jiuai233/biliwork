import 'server-only';
import { Prisma, type Broadcaster as PrismaBroadcaster } from '@prisma/client';
import { prisma } from '@/lib/db';
import { Broadcaster, DashboardStats } from '@/lib/types';

function toBroadcaster(b: PrismaBroadcaster): Broadcaster {
    return {
        id: b.id,
        auth_code: b.authCode,
        room_id: b.roomId,
        uid: b.uid ? Number(b.uid) : null,
        uname: b.uname,
        uface: b.uface,
        open_id: b.openId,
        room_name: b.roomName,
        active: b.active,
        password_hash: b.passwordHash,
        created_at: Number(b.createdAt),
        updated_at: Number(b.updatedAt)
    };
}

function createEmptyStats(): DashboardStats {
    return {
        danmakuCount: 0,
        giftCount: 0,
        guardCount: 0,
        scCount: 0,
        totalIncome: 0
    };
}

async function getTodayStatsByRoomIds(roomIds: number[]): Promise<Map<number, DashboardStats>> {
    const uniqueRoomIds = Array.from(new Set(roomIds.filter(Boolean)));
    const statsByRoomId = new Map<number, DashboardStats>();

    for (const roomId of uniqueRoomIds) {
        statsByRoomId.set(roomId, createEmptyStats());
    }

    if (uniqueRoomIds.length === 0) {
        return statsByRoomId;
    }

    const start = BigInt(new Date().setHours(0, 0, 0, 0));
    const end = BigInt(Date.now());

    const [danmakuRows, giftRows, giftTotalRows, guardRows, scRows] = await Promise.all([
        prisma.danmaku.groupBy({
            by: ['roomId'],
            where: {
                roomId: { in: uniqueRoomIds },
                ts: { gte: start, lte: end }
            },
            _count: { _all: true }
        }),
        prisma.gift.groupBy({
            by: ['roomId'],
            where: {
                roomId: { in: uniqueRoomIds },
                ts: { gte: start, lte: end }
            },
            _count: { _all: true }
        }),
        prisma.$queryRaw<{ room_id: number; total: bigint | null }[]>(Prisma.sql`
            SELECT room_id, SUM(r_price * gift_num)::bigint AS total
            FROM gift
            WHERE room_id IN (${Prisma.join(uniqueRoomIds)})
              AND ts >= ${start}
              AND ts <= ${end}
            GROUP BY room_id
        `),
        prisma.guard.groupBy({
            by: ['roomId'],
            where: {
                roomId: { in: uniqueRoomIds },
                ts: { gte: start, lte: end }
            },
            _count: { _all: true },
            _sum: { price: true }
        }),
        prisma.superChat.groupBy({
            by: ['roomId'],
            where: {
                roomId: { in: uniqueRoomIds },
                ts: { gte: start, lte: end }
            },
            _count: { _all: true },
            _sum: { rmb: true }
        })
    ]);

    for (const row of danmakuRows) {
        statsByRoomId.get(row.roomId)!.danmakuCount = row._count._all;
    }

    for (const row of giftRows) {
        statsByRoomId.get(row.roomId)!.giftCount = row._count._all;
    }

    for (const row of giftTotalRows) {
        const stats = statsByRoomId.get(row.room_id);
        if (stats) {
            stats.totalIncome += Number(row.total || 0) / 1000;
        }
    }

    for (const row of guardRows) {
        const stats = statsByRoomId.get(row.roomId)!;
        stats.guardCount = row._count._all;
        stats.totalIncome += (row._sum.price || 0) / 1000;
    }

    for (const row of scRows) {
        const stats = statsByRoomId.get(row.roomId)!;
        stats.scCount = row._count._all;
        stats.totalIncome += row._sum.rmb || 0;
    }

    for (const stats of statsByRoomId.values()) {
        stats.totalIncome = Number(stats.totalIncome.toFixed(2));
    }

    return statsByRoomId;
}

// Broadcaster Management
export async function getAllBroadcasters(): Promise<(Broadcaster & { stats?: DashboardStats })[]> {
    const broadcasters = await prisma.broadcaster.findMany({
        orderBy: { createdAt: 'desc' }
    });
    const mappedBroadcasters = broadcasters.map((b) => toBroadcaster(b));
    const statsByRoomId = await getTodayStatsByRoomIds(
        mappedBroadcasters
            .map((b) => b.room_id)
            .filter((roomId): roomId is number => roomId !== null)
    );

    return mappedBroadcasters.map((b) => ({
        ...b,
        stats: b.room_id ? statsByRoomId.get(b.room_id) : undefined
    }));
}

export async function addBroadcaster(authCode: string, active = 1, passwordHash: string | null = null): Promise<boolean> {
    try {
        const now = BigInt(Date.now());
        await prisma.broadcaster.create({
            data: {
                authCode,
                active,
                passwordHash,
                createdAt: now,
                updatedAt: now
            }
        });
        return true;
    } catch (e) {
        console.error('Add broadcaster failed:', e);
        return false;
    }
}

export async function updateBroadcasterStatus(id: number, active: boolean): Promise<boolean> {
    const result = await prisma.broadcaster.update({
        where: { id },
        data: {
            active: active ? 1 : 0,
            updatedAt: BigInt(Date.now())
        }
    });
    return !!result;
}

export async function updateBroadcasterPassword(id: number, passwordHash: string): Promise<boolean> {
    const result = await prisma.broadcaster.update({
        where: { id },
        data: {
            passwordHash,
            updatedAt: BigInt(Date.now())
        }
    });
    return !!result;
}

export async function updateBroadcasterAuthCode(
    id: number,
    authCode: string,
    passwordHash?: string
): Promise<{ success: boolean; message?: string }> {
    try {
        await prisma.broadcaster.update({
            where: { id },
            data: {
                authCode,
                ...(passwordHash ? { passwordHash } : {}),
                updatedAt: BigInt(Date.now())
            }
        });
        return { success: true };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                return { success: false, message: '身份码已存在' };
            }
            if (error.code === 'P2025') {
                return { success: false, message: '主播不存在' };
            }
        }
        console.error('Update broadcaster auth code failed:', error);
        return { success: false, message: '更新失败' };
    }
}

export async function deleteBroadcaster(id: number): Promise<boolean> {
    try {
        await prisma.broadcaster.delete({ where: { id } });
        return true;
    } catch {
        return false;
    }
}

export async function getBroadcasterByUidAndCode(uid: number, authCode: string): Promise<Broadcaster | undefined> {
    const b = await prisma.broadcaster.findFirst({
        where: {
            uid: BigInt(uid),
            authCode
        }
    });

    if (!b) return undefined;

    return toBroadcaster(b);
}

export async function getBroadcasterByUidForLogin(uid: number): Promise<Broadcaster | undefined> {
    const b = await prisma.broadcaster.findFirst({
        where: { uid: BigInt(uid) }
    });

    if (!b) return undefined;

    return toBroadcaster(b);
}

export async function getBroadcasterById(id: number): Promise<Broadcaster | undefined> {
    const b = await prisma.broadcaster.findUnique({
        where: { id }
    });

    if (!b) return undefined;

    return toBroadcaster(b);
}

export async function getBroadcasterByUid(uid: number): Promise<Broadcaster | undefined> {
    const b = await prisma.broadcaster.findFirst({
        where: { uid: BigInt(uid) }
    });

    if (!b) return undefined;

    return toBroadcaster(b);
}
