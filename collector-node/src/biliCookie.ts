/** Same xor1: scheme as the web app. One more XOR with the same key restores plaintext. */

import { env } from './config.js';

const PREFIX = 'xor1:';

export function cookieEncryptionSecret(): string {
    return (env.BILI_COOKIE_SECRET || env.SESSION_SECRET || 'default_dev_secret_at_least_32_chars_long!!').trim();
}

function xorBuffer(data: Buffer, secret: string): Buffer {
    const key = Buffer.from(secret, 'utf8');
    if (key.length === 0) {
        throw new Error('缺少对称密钥，无法解密 B 站 Cookie');
    }
    const out = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) {
        out[i] = data[i] ^ key[i % key.length];
    }
    return out;
}

export function decryptCookie(ciphertext: string, secret: string): string | null {
    if (!ciphertext) return ciphertext;
    if (!ciphertext.startsWith(PREFIX)) return ciphertext;
    try {
        const decoded = Buffer.from(ciphertext.slice(PREFIX.length), 'base64');
        return xorBuffer(decoded, secret).toString('utf8');
    } catch {
        return null;
    }
}

export function parseCookieMap(cookieStr: string): Record<string, string> {
    const map: Record<string, string> = {};
    for (const part of cookieStr.split(';')) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const eq = trimmed.indexOf('=');
        if (eq <= 0) continue;
        map[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
    }
    return map;
}
