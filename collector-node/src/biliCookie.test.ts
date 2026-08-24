import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { decryptCookie, parseCookieMap } from './biliCookie.ts';

const PREFIX = 'xor1:';

function encryptCookie(text: string, secret: string): string {
    const key = Buffer.from(secret, 'utf8');
    const data = Buffer.from(text, 'utf8');
    const out = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) out[i] = data[i] ^ key[i % key.length];
    return PREFIX + out.toString('base64');
}

describe('decryptCookie', () => {
    test('restores xor1 ciphertext', () => {
        const secret = 'test-cookie-secret';
        const plain = 'SESSDATA=abc; DedeUserID=123; bili_jct=token';
        assert.equal(decryptCookie(encryptCookie(plain, secret), secret), plain);
    });
});

describe('parseCookieMap', () => {
    test('splits pairs', () => {
        assert.deepEqual(parseCookieMap('SESSDATA=abc; bili_jct=token'), {
            SESSDATA: 'abc',
            bili_jct: 'token',
        });
    });
});

