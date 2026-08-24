import { hasLiveAuthCode, homePathForAuthCode } from '@/lib/access';

describe('live auth access', () => {
    it('treats missing and qr- prefix as gift-only', () => {
        expect(hasLiveAuthCode(null)).toBe(false);
        expect(hasLiveAuthCode('')).toBe(false);
        expect(hasLiveAuthCode('qr-123')).toBe(false);
        expect(homePathForAuthCode(null)).toBe('/gift');
    });

    it('sends real auth codes to the dashboard', () => {
        expect(hasLiveAuthCode('ES7CU61Qxxxx')).toBe(true);
        expect(homePathForAuthCode('ES7CU61Qxxxx')).toBe('/dashboard');
    });
});
