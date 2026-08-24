'use server';

import { requireAuth } from '@/lib/auth';
import { generateBiliQr, pollBiliQr } from '@/lib/bili-client';
import { dropQrSession, rememberQrSession, takeQrSession } from '@/lib/bili-qr-sessions';
import { getBroadcasterByUid } from '@/lib/data';
import {
    getGiftStreamStatus,
    listReceivedGifts,
    enqueueGiftStreamSync,
    saveBiliCookie,
    startGiftStreamSync,
} from '@/lib/services/gift-stream';

async function requireBroadcaster() {
    const uid = await requireAuth();
    const broadcaster = await getBroadcasterByUid(uid);
    if (!broadcaster) {
        throw new Error('找不到主播信息');
    }
    return broadcaster;
}

export async function getGiftStreamData() {
    const broadcaster = await requireBroadcaster();
    const [status, items] = await Promise.all([
        getGiftStreamStatus(broadcaster.id),
        listReceivedGifts(broadcaster.id, 200),
    ]);
    return {
        broadcaster: {
            id: broadcaster.id,
            uid: broadcaster.uid,
            uname: broadcaster.uname,
        },
        status,
        items,
    };
}

export async function generateBindQrAction() {
    const broadcaster = await requireBroadcaster();
    if (!broadcaster.uid) {
        return { ok: false as const, message: '主播尚未绑定 UID' };
    }
    try {
        const qr = await generateBiliQr();
        rememberQrSession(qr.qrcodeKey, broadcaster.uid);
        return { ok: true as const, url: qr.url, qrcodeKey: qr.qrcodeKey };
    } catch (error) {
        console.error('Generate bind QR failed:', error);
        return { ok: false as const, message: error instanceof Error ? error.message : '无法生成二维码' };
    }
}

export async function pollBindQrAction(qrcodeKey: string) {
    const broadcaster = await requireBroadcaster();
    if (!qrcodeKey) {
        return { phase: 'error' as const, message: '二维码无效' };
    }
    const session = takeQrSession(qrcodeKey);
    if (!session) {
        return { phase: 'expired' as const, message: '二维码已过期，请刷新' };
    }

    try {
        const result = await pollBiliQr(qrcodeKey);
        if (result.phase !== 'success') {
            return { phase: result.phase, message: result.message };
        }

        dropQrSession(qrcodeKey);
        if (session.expectedUid && result.uid !== session.expectedUid) {
            return { phase: 'mismatch' as const, message: `扫码账号 UID ${result.uid} 与当前登录 UID ${session.expectedUid} 不一致` };
        }
        if (broadcaster.uid && result.uid !== broadcaster.uid) {
            return { phase: 'mismatch' as const, message: `扫码账号 UID ${result.uid} 与当前登录 UID ${broadcaster.uid} 不一致` };
        }

        await saveBiliCookie(broadcaster.id, result.cookie, result.uid);
        await enqueueGiftStreamSync(broadcaster.id);
        return { phase: 'success' as const, message: '绑定成功，已加入礼物流水队列' };
    } catch (error) {
        console.error('Poll bind QR failed:', error);
        return { phase: 'error' as const, message: error instanceof Error ? error.message : '扫码失败' };
    }
}

export async function startGiftStreamSyncAction() {
    const broadcaster = await requireBroadcaster();
    return startGiftStreamSync(broadcaster.id);
}
