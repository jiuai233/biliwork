
'use server';

import { login } from '@/lib/auth';

export async function loginAction(uid: number, password: string) {
    if (!Number.isInteger(uid) || uid <= 0) {
        return { success: false };
    }
    try {
        const success = await login(uid, password);
        return { success };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false };
    }
}
