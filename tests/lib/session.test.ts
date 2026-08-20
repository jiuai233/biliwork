import { cookieSecure, passwordStamp } from '@/lib/session';

describe('passwordStamp', () => {
    it('uses the last 16 characters of a hash', () => {
        expect(passwordStamp('abcdefghijklmnopqrstuvwxyz')).toBe('klmnopqrstuvwxyz');
    });

    it('returns empty string when no hash exists', () => {
        expect(passwordStamp(null)).toBe('');
        expect(passwordStamp(undefined)).toBe('');
    });
});

describe('cookieSecure', () => {
    const keys = ['NEXT_PUBLIC_APP_URL', 'APP_URL', 'SITE_URL'] as const;
    const original = new Map<string, string | undefined>();

    beforeEach(() => {
        for (const key of keys) {
            original.set(key, process.env[key]);
            delete process.env[key];
        }
    });

    afterEach(() => {
        for (const key of keys) {
            const value = original.get(key);
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    });

    it('is false without an https origin', () => {
        expect(cookieSecure()).toBe(false);
        process.env.APP_URL = 'http://bili.jiuai233.work';
        expect(cookieSecure()).toBe(false);
    });

    it('is true when APP_URL is https', () => {
        process.env.APP_URL = 'https://bili.jiuai233.work';
        expect(cookieSecure()).toBe(true);
    });
});
