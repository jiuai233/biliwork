'use server';

// 服务器端认证工具 - 使用 iron-session 加密会话
// 替代旧版裸 UID Cookie 存储

import { getBroadcasterByUidAndCode, getBroadcasterByUidForLogin } from './data';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import bcrypt from 'bcryptjs';

// ==================== Session 配置 ====================

interface SessionData {
    uid: number;
    isLoggedIn: boolean;
}

const sessionOptions = {
    password: process.env.SESSION_SECRET || 'default_dev_secret_at_least_32_chars_long!!',
    cookieName: 'auth_session',
    cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax' as const,
        maxAge: 7 * 24 * 60 * 60, // 7天
    },
};

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

        const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
        session.uid = Number(user.uid);
        session.isLoggedIn = true;
        await session.save();
        return true;
    }
    return false;
}

export async function logout() {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    session.destroy();
    redirect('/login');
}

export async function getSession() {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) return null;
    return session.uid;
}

export async function requireAuth() {
    const uid = await getSession();
    if (!uid) {
        redirect('/login');
    }
    return uid;
}
