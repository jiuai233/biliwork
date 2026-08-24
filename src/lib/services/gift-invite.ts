import { prisma } from '@/lib/db';
import {
    checkInvite,
    generateInviteCode,
    inviteCheckMessage,
    normalizeInviteCode,
    type InviteCheck,
} from '@/lib/gift-invite';
import {
    clearGiftInviteSession,
    getGiftInviteSession,
    saveGiftInviteSession,
} from '@/lib/gift-invite-session';

export type GiftInviteView = {
    id: number;
    code: string;
    maxUses: number;
    usedCount: number;
    expiresAt: number;
    note: string | null;
    disabled: number;
    createdAt: number;
    createdBy: string | null;
    status: Exclude<InviteCheck, 'not_found'>;
};

function toView(row: {
    id: number;
    code: string;
    maxUses: number;
    usedCount: number;
    expiresAt: bigint;
    note: string | null;
    disabled: number;
    createdAt: bigint;
    createdBy: string | null;
}): GiftInviteView {
    return {
        id: row.id,
        code: row.code,
        maxUses: row.maxUses,
        usedCount: row.usedCount,
        expiresAt: Number(row.expiresAt),
        note: row.note,
        disabled: row.disabled,
        createdAt: Number(row.createdAt),
        createdBy: row.createdBy,
        status: checkInvite(row),
    };
}

export async function listGiftInvites(): Promise<GiftInviteView[]> {
    const rows = await prisma.giftInvite.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
    });
    return rows.map(toView);
}

export async function createGiftInvite(input: {
    code?: string;
    maxUses: number;
    expiresAt: number;
    note?: string;
    createdBy?: string;
}): Promise<{ ok: true; invite: GiftInviteView } | { ok: false; message: string }> {
    const code = normalizeInviteCode(input.code || generateInviteCode());
    if (code.length < 4 || code.length > 16) {
        return { ok: false, message: '邀请码长度需要 4 到 16 位字母或数字' };
    }
    if (!Number.isInteger(input.maxUses) || input.maxUses < 1) {
        return { ok: false, message: '最大访问次数至少为 1' };
    }
    if (!Number.isFinite(input.expiresAt) || input.expiresAt <= Date.now()) {
        return { ok: false, message: '过期时间必须晚于现在' };
    }

    const now = BigInt(Date.now());
    try {
        const created = await prisma.giftInvite.create({
            data: {
                code,
                maxUses: input.maxUses,
                usedCount: 0,
                expiresAt: BigInt(input.expiresAt),
                note: input.note?.trim() || null,
                createdAt: now,
                createdBy: input.createdBy ?? null,
            },
        });
        return { ok: true, invite: toView(created) };
    } catch (error) {
        console.error('Create gift invite failed:', error);
        const duplicate = typeof error === 'object' && error && 'code' in error && error.code === 'P2002';
        if (duplicate) return { ok: false, message: '邀请码已存在' };
        const missingModel = error instanceof TypeError && String(error.message).includes('giftInvite');
        return {
            ok: false,
            message: missingModel
                ? '数据库客户端还没跟上，请停掉 next 后执行 bunx prisma generate 再启动'
                : '创建邀请码失败',
        };
    }
}

export async function disableGiftInvite(id: number): Promise<boolean> {
    const result = await prisma.giftInvite.updateMany({
        where: { id },
        data: { disabled: 1 },
    });
    return result.count > 0;
}

export async function redeemGiftInvite(rawCode: string): Promise<{ ok: true } | { ok: false; message: string }> {
    const code = normalizeInviteCode(rawCode);
    if (!code) {
        return { ok: false, message: '请输入访问码' };
    }

    const result = await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<Array<{
            id: number;
            code: string;
            max_uses: number;
            used_count: number;
            expires_at: bigint;
            disabled: number;
        }>>`
            SELECT id, code, max_uses, used_count, expires_at, disabled
            FROM gift_invites
            WHERE code = ${code}
            FOR UPDATE
        `;
        const row = rows[0];
        if (!row) return { check: 'not_found' as const };

        const check = checkInvite({
            disabled: row.disabled,
            expiresAt: row.expires_at,
            usedCount: row.used_count,
            maxUses: row.max_uses,
        });
        if (check !== 'ok') return { check };

        await tx.giftInvite.update({
            where: { id: row.id },
            data: { usedCount: { increment: 1 } },
        });
        return {
            check: 'ok' as const,
            id: row.id,
            code: row.code,
            expiresAt: Number(row.expires_at),
        };
    });

    if (result.check !== 'ok' || !('id' in result)) {
        return { ok: false, message: inviteCheckMessage(result.check) };
    }

    await saveGiftInviteSession(result.id, result.code, result.expiresAt);
    return { ok: true };
}

export async function getValidRedeemedInvite(): Promise<{ inviteId: number; code: string } | null> {
    const session = await getGiftInviteSession();
    if (!session.inviteId) return null;
    const invite = await prisma.giftInvite.findUnique({ where: { id: session.inviteId } });
    if (!invite) {
        await clearGiftInviteSession();
        return null;
    }
    // Cookie 已经算过一次访问；只要码还没停用、没过期，就继续有效。
    if (invite.disabled || Number(invite.expiresAt) <= Date.now()) {
        await clearGiftInviteSession();
        return null;
    }
    return { inviteId: invite.id, code: invite.code };
}
