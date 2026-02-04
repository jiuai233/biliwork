import 'server-only';
import { prisma } from '@/lib/db';
import { Broadcaster, DashboardStats } from '@/lib/types';
import { getStats } from './analytics';

// Broadcaster Management
export async function getAllBroadcasters(): Promise<(Broadcaster & { stats?: DashboardStats })[]> {
    const broadcasters = await prisma.broadcaster.findMany({
        orderBy: { createdAt: 'desc' }
    });

    const result = await Promise.all(broadcasters.map(async (b) => {
        let stats: DashboardStats | undefined;
        if (b.roomId) {
            const todayStart = new Date().setHours(0, 0, 0, 0);
            stats = await getStats(b.roomId, todayStart);
        }

        // Convert Prisma model to legacy Broadcaster type
        const broadcaster: Broadcaster = {
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

        return { ...broadcaster, stats };
    }));

    return result;
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

export async function getBroadcasterByUid(uid: number): Promise<Broadcaster | undefined> {
    const b = await prisma.broadcaster.findFirst({
        where: { uid: BigInt(uid) }
    });

    if (!b) return undefined;

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
