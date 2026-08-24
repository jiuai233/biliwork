export function normalizeInviteCode(raw: string): string {
    return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function formatInviteCode(code: string): string {
    const normalized = normalizeInviteCode(code);
    if (normalized.length === 8) {
        return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
    }
    return normalized;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateInviteCode(length = 8): string {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    let out = '';
    for (const byte of bytes) {
        out += ALPHABET[byte % ALPHABET.length];
    }
    return out;
}

export type InviteCheck = 'ok' | 'not_found' | 'disabled' | 'expired' | 'exhausted';

export type InviteRecord = {
    disabled: number;
    expiresAt: bigint | number;
    usedCount: number;
    maxUses: number;
};

export function checkInvite(invite: InviteRecord, now = Date.now()): Exclude<InviteCheck, 'not_found'> {
    if (invite.disabled) return 'disabled';
    if (Number(invite.expiresAt) <= now) return 'expired';
    if (invite.usedCount >= invite.maxUses) return 'exhausted';
    return 'ok';
}

export function inviteCheckMessage(check: InviteCheck): string {
    switch (check) {
        case 'ok':
            return '';
        case 'not_found':
            return '访问码不存在';
        case 'disabled':
            return '访问码已停用';
        case 'expired':
            return '访问码已过期';
        case 'exhausted':
            return '访问码已达到最大访问次数';
    }
}
