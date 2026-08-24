'use server';

// 服务器端认证工具 - 使用 iron-session 加密会话
// 替代旧版裸 UID Cookie 存储

import { getBroadcasterByUidAndCode, getBroadcasterByUidForLogin } from './data';
import { prisma } from './db';
import {
    broadcasterSessionOptions,
    passwordStamp,
    type BroadcasterSessionData,
} from './session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import bcrypt from 'bcryptjs';

// ==================== 主播认证 ====================

async function establishBroadcasterSession(user: {
    id: number;
    user_id?: number | null;
    uid: number | null;
    password_hash?: string | null;
}) {
    if (!user.uid) return false;

    const now = BigInt(Date.now());
    try {
        await prisma.$executeRawUnsafe(
            'UPDATE broadcasters SET last_login_at = $1 WHERE id = $2',
            now, user.id,
        );
        if (user.user_id) {
            await prisma.user.update({
                where: { id: user.user_id },
                data: { lastLoginAt: now, updatedAt: now },
            });
        }
    } catch (error) {
        console.error('Failed to record last login:', error);
    }

    const session = await getIronSession<BroadcasterSessionData>(await cookies(), broadcasterSessionOptions());
    session.uid = Number(user.uid);
    session.userId = user.user_id ?? undefined;
    session.isLoggedIn = true;
    session.pwdv = passwordStamp(user.password_hash);
    await session.save();
    return true;
}

export async function login(uid: number, password: string) {
    const user = await getBroadcasterByUidForLogin(uid);
    let isValid = false;

    if (user?.password_hash) {
        isValid = await bcrypt.compare(password, user.password_hash);
    } else {
        // Legacy fallback for records created before password_hash existed.
        isValid = !!(await getBroadcasterByUidAndCode(uid, password));
    }

    if (user && user.uid) {
        if (!isValid) return false;
        return establishBroadcasterSession(user);
    }
    return false;
}

export async function loginByUid(uid: number) {
    const user = await getBroadcasterByUidForLogin(uid);
    if (!user || !user.uid) return false;
    return establishBroadcasterSession(user);
}

export async function logout() {
    const session = await getIronSession<BroadcasterSessionData>(await cookies(), broadcasterSessionOptions());
    session.destroy();
    redirect('/login');
}

export async function getSession() {
    const session = await getIronSession<BroadcasterSessionData>(await cookies(), broadcasterSessionOptions());
    if (!session.isLoggedIn) return null;

    if (session.userId) {
        const account = await prisma.user.findUnique({ where: { id: session.userId } });
        if (!account || passwordStamp(account.passwordHash) !== (session.pwdv ?? '')) {
            return null;
        }
        if (session.uid) return session.uid;
        const identity = await prisma.userIdentity.findFirst({
            where: { userId: account.id, provider: 'bilibili' },
        });
        return identity ? Number(identity.providerUid) : null;
    }

    if (!session.uid) return null;
    const user = await getBroadcasterByUidForLogin(session.uid);
    if (!user || passwordStamp(user.password_hash) !== (session.pwdv ?? '')) {
        return null;
    }
    return session.uid;
}

export async function requireAuth() {
    const uid = await getSession();
    if (!uid) {
        redirect('/login');
    }
    return uid;
}
