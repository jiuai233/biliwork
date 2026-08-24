/** 对称异或 + Base64。库里存 `xor1:...`，用同一把密钥再异或一次就能还原。 */

const PREFIX = 'xor1:';

export function looksLikeEncryptedCookie(value: string | null | undefined): boolean {
    return String(value ?? '').startsWith(PREFIX);
}

export function cookieEncryptionSecret(): string {
    return (process.env.BILI_COOKIE_SECRET || process.env.SESSION_SECRET || 'default_dev_secret_at_least_32_chars_long!!').trim();
}

function xorBuffer(data: Buffer, secret: string): Buffer {
    const key = Buffer.from(secret, 'utf8');
    if (key.length === 0) {
        throw new Error('缺少对称密钥，无法加解密 B 站 Cookie');
    }
    const out = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) {
        out[i] = data[i] ^ key[i % key.length];
    }
    return out;
}

export function encryptCookie(text: string, secret: string): string {
    if (!text) return text;
    return PREFIX + xorBuffer(Buffer.from(text, 'utf8'), secret).toString('base64');
}

export function decryptCookie(ciphertext: string, secret: string): string | null {
    if (!ciphertext) return ciphertext;
    if (!looksLikeEncryptedCookie(ciphertext)) {
        return ciphertext;
    }
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

export function cookiePairsFromHeaders(headers: Headers): string[] {
    const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
    const raw = typeof getSetCookie === 'function' ? getSetCookie.call(headers) : [];
    return raw.map((cookie) => cookie.split(';', 1)[0]?.trim()).filter(Boolean) as string[];
}
