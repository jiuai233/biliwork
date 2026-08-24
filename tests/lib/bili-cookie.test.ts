import { decryptCookie, encryptCookie, looksLikeEncryptedCookie, parseCookieMap } from '@/lib/bili-cookie';

const SECRET = 'test-cookie-secret';

describe('bili cookie crypto', () => {
    it('round-trips SESSDATA cookies', () => {
        const plaintext = 'SESSDATA=abc; DedeUserID=123; bili_jct=token';
        const encrypted = encryptCookie(plaintext, SECRET);

        expect(looksLikeEncryptedCookie(encrypted)).toBe(true);
        expect(decryptCookie(encrypted, SECRET)).toBe(plaintext);
    });

    it('uses the same key to restore plaintext', () => {
        const encrypted = encryptCookie('hello', SECRET);
        expect(decryptCookie(encrypted, 'other-secret')).not.toBe('hello');
        expect(decryptCookie(encrypted, SECRET)).toBe('hello');
    });

    it('parses cookie pairs', () => {
        expect(parseCookieMap('SESSDATA=abc; bili_jct=token')).toEqual({
            SESSDATA: 'abc',
            bili_jct: 'token',
        });
    });
});
