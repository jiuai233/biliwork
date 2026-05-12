import 'server-only';
import { Prisma, type Broadcaster as PrismaBroadcaster } from '@prisma/client';
import { prisma } from '@/lib/db';
import { Broadcaster, DashboardStats } from '@/lib/types';

export type BroadcasterAdminRow = Broadcaster & {
    stats?: DashboardStats;
    isLive?: boolean;
};

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

async function getLiveStatusByRoomIds(roomIds: number[]): Promise<Map<number, boolean>> {
    const uniqueRoomIds = Array.from(new Set(roomIds.filter(Boolean)));
    const liveByRoomId = new Map<number, boolean>();

    for (const roomId of uniqueRoomIds) {
        liveByRoomId.set(roomId, false);
    }

    if (uniqueRoomIds.length === 0) {
        return liveByRoomId;
    }

    const rows = await prisma.$queryRaw<{ room_id: number; is_start: number }[]>(Prisma.sql`
        SELECT DISTINCT ON (room_id) room_id, is_start
        FROM live_status
        WHERE room_id IN (${Prisma.join(uniqueRoomIds)})
          AND ts IS NOT NULL
        ORDER BY room_id, ts DESC
    `);

    for (const row of rows) {
        liveByRoomId.set(row.room_id, row.is_start === 1);
    }

    return liveByRoomId;
}

// Broadcaster Management
export async function getAllBroadcasters(): Promise<BroadcasterAdminRow[]> {
    const broadcasters = await prisma.broadcaster.findMany({
        orderBy: { createdAt: 'desc' }
    });
    const mappedBroadcasters = broadcasters.map((b) => toBroadcaster(b));
    const roomIds = mappedBroadcasters
        .map((b) => b.room_id)
        .filter((roomId): roomId is number => roomId !== null);
    const [statsByRoomId, liveByRoomId] = await Promise.all([
        getTodayStatsByRoomIds(roomIds),
        getLiveStatusByRoomIds(roomIds),
    ]);

    return mappedBroadcasters.map((b) => ({
        ...b,
        stats: b.room_id ? statsByRoomId.get(b.room_id) : undefined,
        isLive: b.room_id ? liveByRoomId.get(b.room_id) ?? false : false,
    }));
}

export type CreateBroadcasterResult = {
    success: boolean;
    message?: string;
};

function getPrismaErrorCode(error: unknown): string | undefined {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return error.code;
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
        return error.errorCode;
    }

    return undefined;
}

function getPrismaErrorTarget(error: unknown): string[] {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
        return [];
    }

    const target = error.meta?.target;
    if (Array.isArray(target)) {
        return target.map(String);
    }

    return typeof target === 'string' ? [target] : [];
}

function isUniqueConflictOn(error: unknown, field: string): boolean {
    if (getPrismaErrorCode(error) !== 'P2002') {
        return false;
    }

    const target = getPrismaErrorTarget(error);
    return target.some((value) => value === field || value.includes(field));
}

function getCreateBroadcasterErrorMessage(error: unknown): string {
    const code = getPrismaErrorCode(error);

    if (code === 'P2002') {
        if (isUniqueConflictOn(error, 'id')) {
            return '数据库主键序列异常，请稍后重试';
        }

        return '身份码已存在';
    }

    if (code === 'P1001') {
        return '数据库连接失败，请检查 PostgreSQL 是否运行';
    }

    if (code === 'P2021') {
        return '数据库缺少 broadcasters 表，请先初始化数据库';
    }

    if (code === 'P2022') {
        return '数据库表结构不完整，请检查 broadcasters 字段';
    }

    return '添加失败，请查看服务端日志';
}

async function createBroadcasterRecord(authCode: string, active: number, passwordHash: string | null) {
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
}

async function repairBroadcasterIdSequence() {
    await prisma.$queryRaw`
        SELECT setval(
            pg_get_serial_sequence('broadcasters', 'id'),
            COALESCE((SELECT MAX(id) FROM broadcasters), 1),
            EXISTS(SELECT 1 FROM broadcasters)
        )
    `;
}

export async function addBroadcaster(
    authCode: string,
    active = 1,
    passwordHash: string | null = null
): Promise<CreateBroadcasterResult> {
    try {
        await createBroadcasterRecord(authCode, active, passwordHash);
        return { success: true };
    } catch (e) {
        if (isUniqueConflictOn(e, 'id')) {
            try {
                await repairBroadcasterIdSequence();
                await createBroadcasterRecord(authCode, active, passwordHash);
                return { success: true };
            } catch (retryError) {
                const retryCode = getPrismaErrorCode(retryError);
                console.error('Add broadcaster retry after sequence repair failed:', { code: retryCode, error: retryError });
                return { success: false, message: getCreateBroadcasterErrorMessage(retryError) };
            }
        }

        const code = getPrismaErrorCode(e);
        console.error('Add broadcaster failed:', { code, error: e });
        return { success: false, message: getCreateBroadcasterErrorMessage(e) };
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
