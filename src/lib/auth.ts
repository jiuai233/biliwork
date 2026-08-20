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

        // 记录最后登录时间（不阻断登录流程）
        try {
            await prisma.$executeRawUnsafe(
                'UPDATE broadcasters SET last_login_at = $1 WHERE id = $2',
                BigInt(Date.now()), user.id,
            );
        } catch (error) {
            console.error('Failed to record last login:', error);
        }

        const session = await getIronSession<BroadcasterSessionData>(await cookies(), broadcasterSessionOptions());
        session.uid = Number(user.uid);
        session.isLoggedIn = true;
        session.pwdv = passwordStamp(user.password_hash);
        await session.save();
        return true;
    }
    return false;
}

export async function logout() {
    const session = await getIronSession<BroadcasterSessionData>(await cookies(), broadcasterSessionOptions());
    session.destroy();
    redirect('/login');
}

export async function getSession() {
    const session = await getIronSession<BroadcasterSessionData>(await cookies(), broadcasterSessionOptions());
    if (!session.isLoggedIn || !session.uid) return null;

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
