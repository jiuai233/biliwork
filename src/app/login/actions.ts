
'use server';

import { homePathForAuthCode } from '@/lib/access';
import { login } from '@/lib/auth';
import { getBroadcasterByUid } from '@/lib/data';

export async function loginAction(uid: number, password: string) {
    if (!Number.isInteger(uid) || uid <= 0) {
        return { success: false as const };
    }
    try {
        const success = await login(uid, password);
        if (!success) return { success: false as const };
        const broadcaster = await getBroadcasterByUid(uid);
        return { success: true as const, next: homePathForAuthCode(broadcaster?.auth_code) };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false as const };
    }
}
