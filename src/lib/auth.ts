'use server';

// 这是一个简单的服务器端 Auth 工具
// 使用 Next.js Server Actions 或 API Route 调用

import { getBroadcasterByUidAndCode } from './data';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const COOKIE_NAME = 'auth_session';

export async function login(uid: number, authCode: string) {
    const user = await getBroadcasterByUidAndCode(uid, authCode);
    if (user && user.uid) {
        // 简单的 session，实际生产环境应该用加密的 token (JWT / Iron Session)
        // 这里为了演示方便，直接存 uid
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天
        const cookieStore = await cookies();
        cookieStore.set(COOKIE_NAME, user.uid.toString(), { httpOnly: true, expires });
        return true;
    }
    return false;
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
    redirect('/login');
}

export async function getSession() {
    const cookieStore = await cookies();
    const uid = cookieStore.get(COOKIE_NAME)?.value;
    if (!uid) return null;
    return Number(uid);
}

export async function requireAuth() {
    const uid = await getSession();
    if (!uid) {
        redirect('/login');
    }
    return uid;
}
