
'use server';

import { login } from '@/lib/auth';

export async function loginAction(uid: number, password: string) {
    try {
        const success = await login(uid, password);
        return { success };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false };
    }
}
