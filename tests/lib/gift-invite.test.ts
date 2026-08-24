import {
    checkInvite,
    formatInviteCode,
    inviteCheckMessage,
    normalizeInviteCode,
} from '@/lib/gift-invite';

describe('gift invite helpers', () => {
    it('normalizes dashes and case', () => {
        expect(normalizeInviteCode('ab-cd 12')).toBe('ABCD12');
        expect(formatInviteCode('abcd1234')).toBe('ABCD-1234');
    });

    it('rejects expired, exhausted and disabled codes', () => {
        const now = 1_700_000_000_000;
        expect(checkInvite({ disabled: 1, expiresAt: now + 1, usedCount: 0, maxUses: 3 }, now)).toBe('disabled');
        expect(checkInvite({ disabled: 0, expiresAt: now, usedCount: 0, maxUses: 3 }, now)).toBe('expired');
        expect(checkInvite({ disabled: 0, expiresAt: now + 1, usedCount: 3, maxUses: 3 }, now)).toBe('exhausted');
        expect(checkInvite({ disabled: 0, expiresAt: now + 1, usedCount: 2, maxUses: 3 }, now)).toBe('ok');
    });

    it('maps check results to copy', () => {
        expect(inviteCheckMessage('not_found')).toContain('不存在');
        expect(inviteCheckMessage('exhausted')).toContain('最大访问次数');
        expect(inviteCheckMessage('not_found')).toContain('访问码');
    });
});
