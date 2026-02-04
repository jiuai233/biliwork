
'use server';

import { login } from '@/lib/auth';

export async function loginAction(uid: number, authCode: string) {
    try {
        const success = await login(uid, authCode);
        return { success };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false };
    }
}
