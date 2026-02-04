'use server';

import {
    getAdminUser, createAdminUser,
    getAllBroadcasters, addBroadcaster,
    updateBroadcasterStatus, deleteBroadcaster,
    updateBroadcasterPassword,
    updateAdminPassword
} from '@/lib/data';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';

const ADMIN_COOKIE_NAME = 'admin_session';

// ==================== Admin Auth ====================

export async function adminLogin(prevState: { message: string } | undefined, formData: FormData) {
    console.log('[AdminLogin] Received formData:', Object.fromEntries(formData.entries()));

    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    console.log('[AdminLogin] Parsed:', { username, password });

    if (!username || !password) {
        return { message: '用户名和密码不能为空' };
    }

    try {
        let user = await getAdminUser(username);

        // 初始化默认管理员（如果不存在且尝试登录默认账号）
        // 生产环境建议删除这段逻辑
        if (!user && username === 'admin' && password === 'admin') {
            const hash = await bcrypt.hash(password, 10);
            await createAdminUser(username, hash);
            user = await getAdminUser(username);
        }

        if (!user) {
            return { message: '用户不存在' };
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return { message: '密码错误' };
        }

        // Set session
        const cookieStore = await cookies();
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
        cookieStore.set(ADMIN_COOKIE_NAME, user.username, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            expires
        });

    } catch (error) {
        console.error('Admin login error:', error);
        return { message: '服务器内部错误' };
    }

    redirect('/admin');
}

export async function adminLogout() {
    const cookieStore = await cookies();
    cookieStore.delete(ADMIN_COOKIE_NAME);
    redirect('/admin/login');
}

export async function getAdminSession() {
    const cookieStore = await cookies();
    return cookieStore.get(ADMIN_COOKIE_NAME)?.value;
}

export async function changeAdminPasswordAction(newPassword: string) {
    const username = await getAdminSession();
    if (!username) return { success: false, message: '未登录' };

    if (!newPassword || newPassword.length < 5) {
        return { success: false, message: '密码长度至少5位' };
    }

    try {
        const hash = await bcrypt.hash(newPassword, 10);
        const success = await updateAdminPassword(username, hash);
        return { success, message: success ? '管理员密码已修改' : '修改失败' };
    } catch (e) {
        return { success: false, message: '系统错误' };
    }
}

// ==================== Broadcaster Management ====================

// Check auth helper
async function requireAdmin() {
    const username = await getAdminSession();
    if (!username) {
        redirect('/admin/login');
    }
}

export async function fetchBroadcasters() {
    await requireAdmin();
    return await getAllBroadcasters();
}

export async function createBroadcasterAction(formData: FormData) {
    await requireAdmin();
    const authCode = formData.get('authCode') as string;
    if (!authCode) return { success: false, message: '身份码不能为空' };

    const passwordHash = await bcrypt.hash(authCode, 10);
    const success = await addBroadcaster(authCode, 1, passwordHash);

    if (!success) return { success: false, message: '添加失败，可能已存在' };
    return { success: true };
}

export async function updateBroadcasterPasswordAction(id: number, newPassword: string) {
    await requireAdmin();
    if (!newPassword || newPassword.length < 4) {
        return { success: false, message: '密码长度至少4位' };
    }

    try {
        const hash = await bcrypt.hash(newPassword, 10);
        const success = await updateBroadcasterPassword(id, hash);
        return { success, message: success ? '密码已更新' : '更新失败' };
    } catch (e) {
        return { success: false, message: '系统错误' };
    }
}

export async function toggleBroadcasterAction(id: number, currentStatus: number) {
    await requireAdmin();
    const newStatus = currentStatus === 1 ? false : true;
    const success = await updateBroadcasterStatus(id, newStatus);
    return { success };
}

export async function deleteBroadcasterAction(id: number) {
    await requireAdmin();
    const success = await deleteBroadcaster(id);
    return { success };
}
