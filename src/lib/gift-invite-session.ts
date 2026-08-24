import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { cookieSecure } from '@/lib/session';

export type GiftInviteSessionData = {
    inviteId?: number;
    code?: string;
};

export function giftInviteSessionOptions(maxAgeSeconds = 7 * 24 * 60 * 60) {
    return {
        password: process.env.SESSION_SECRET || 'default_dev_secret_at_least_32_chars_long!!',
        cookieName: 'gift_invite',
        cookieOptions: {
            secure: cookieSecure(),
            httpOnly: true,
            sameSite: 'lax' as const,
            maxAge: Math.max(60, maxAgeSeconds),
        },
    };
}

export async function getGiftInviteSession() {
    return getIronSession<GiftInviteSessionData>(await cookies(), giftInviteSessionOptions());
}

export async function saveGiftInviteSession(inviteId: number, code: string, expiresAt: number) {
    const ttl = Math.floor((expiresAt - Date.now()) / 1000);
    const session = await getIronSession<GiftInviteSessionData>(
        await cookies(),
        giftInviteSessionOptions(ttl),
    );
    session.inviteId = inviteId;
    session.code = code;
    await session.save();
}

export async function clearGiftInviteSession() {
    const session = await getGiftInviteSession();
    session.destroy();
}
