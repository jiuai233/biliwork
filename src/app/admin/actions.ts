'use server';

import {
    getAdminUser,
    getAllBroadcasters, addBroadcaster,
    updateBroadcasterStatus, deleteBroadcaster,
    updateBroadcasterPassword,
    updateAdminPassword
} from '@/lib/data';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { getIronSession } from 'iron-session';

// ==================== Admin Session 配置 ====================

interface AdminSessionData {
    username: string;
    isLoggedIn: boolean;
}

const adminSessionOptions = {
    password: process.env.SESSION_SECRET || 'default_dev_secret_at_least_32_chars_long!!',
    cookieName: 'admin_session',
    cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax' as const,
        maxAge: 24 * 60 * 60, // 1天
    },
};

// ==================== Admin Auth ====================

export async function adminLogin(prevState: { message: string } | undefined, formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    if (!username || !password) {
        return { message: '用户名和密码不能为空' };
    }

    try {
        const user = await getAdminUser(username);

        // 已删除: admin/admin 自动创建后门逻辑
        // 初始管理员请通过 reset_admin 脚本创建

        if (!user) {
            return { message: '用户不存在' };
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return { message: '密码错误' };
        }

        // 使用 iron-session 加密会话
        const session = await getIronSession<AdminSessionData>(await cookies(), adminSessionOptions);
        session.username = user.username;
        session.isLoggedIn = true;
        await session.save();

    } catch (error) {
        console.error('Admin login error:', error);
        return { message: '服务器内部错误' };
    }

    redirect('/admin');
}

export async function adminLogout() {
    const session = await getIronSession<AdminSessionData>(await cookies(), adminSessionOptions);
    session.destroy();
    redirect('/admin/login');
}

export async function getAdminSession() {
    const session = await getIronSession<AdminSessionData>(await cookies(), adminSessionOptions);
    if (!session.isLoggedIn) return undefined;
    return session.username;
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
    } catch {
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
    } catch {
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
