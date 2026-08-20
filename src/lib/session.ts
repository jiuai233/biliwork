export type BroadcasterSessionData = {
    uid: number;
    isLoggedIn: boolean;
    pwdv: string;
};

export function passwordStamp(hash: string | null | undefined): string {
    return hash ? hash.slice(-16) : '';
}

export function cookieSecure(): boolean {
    const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.SITE_URL || '';
    return origin.startsWith('https://');
}

export function broadcasterSessionOptions() {
    return {
        password: process.env.SESSION_SECRET || 'default_dev_secret_at_least_32_chars_long!!',
        cookieName: 'auth_session',
        cookieOptions: {
            secure: cookieSecure(),
            httpOnly: true,
            sameSite: 'lax' as const,
            maxAge: 7 * 24 * 60 * 60,
        },
    };
}
