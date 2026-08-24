'use server';

import { getSession, loginByUid } from '@/lib/auth';
import { fetchBiliProfile, generateBiliQr, pollBiliQr } from '@/lib/bili-client';
import { dropQrSession, rememberQrSession, takeQrSession } from '@/lib/bili-qr-sessions';
import { ensureBroadcasterFromQr, getBroadcasterByUid } from '@/lib/data';
import {
    buildGiftStreamCsv,
    enqueueGiftStreamSync,
    getGiftReport,
    saveBiliCookie,
} from '@/lib/services/gift-stream';

export async function generateGiftQrAction() {
    try {
        const qr = await generateBiliQr();
        rememberQrSession(qr.qrcodeKey);
        return { ok: true as const, url: qr.url, qrcodeKey: qr.qrcodeKey };
    } catch (error) {
        console.error('Generate gift QR failed:', error);
        return { ok: false as const, message: error instanceof Error ? error.message : '无法生成二维码' };
    }
}

export async function pollGiftQrAction(qrcodeKey: string) {
    if (!qrcodeKey) {
        return { phase: 'error' as const, message: '二维码无效' };
    }
    try {
        const result = await pollBiliQr(qrcodeKey);
        if (result.phase === 'pending') {
            return { phase: 'pending' as const, message: '请用哔哩哔哩 App 扫码' };
        }
        if (result.phase === 'scanned') {
            return { phase: 'scanned' as const, message: '已扫码，请在手机上确认' };
        }
        if (result.phase !== 'success') {
            return { phase: result.phase, message: result.message };
        }

        takeQrSession(qrcodeKey);

        dropQrSession(qrcodeKey);
        const profile = await fetchBiliProfile(result.cookie, result.uid);
        const user = await ensureBroadcasterFromQr(result.uid, profile);
        await saveBiliCookie(user.id, result.cookie, result.uid);
        const loggedIn = await loginByUid(result.uid);
        if (!loggedIn) {
            return { phase: 'error' as const, message: '扫码成功但无法打开报告' };
        }
        await enqueueGiftStreamSync(user.id);
        return { phase: 'success' as const, message: '扫码成功，正在生成报告' };
    } catch (error) {
        console.error('Poll gift QR failed:', error);
        return { phase: 'error' as const, message: error instanceof Error ? error.message : '扫码失败' };
    }
}

async function requireScannedBroadcaster() {
    const uid = await getSession();
    if (!uid) return null;
    return (await getBroadcasterByUid(uid)) ?? null;
}

export async function getGiftReportAction(startTime?: number, endTime?: number) {
    const broadcaster = await requireScannedBroadcaster();
    if (!broadcaster) {
        return { ok: false as const, message: '请先扫码' };
    }
    const report = await getGiftReport(broadcaster.id, startTime, endTime);
    return {
        ok: true as const,
        uname: broadcaster.uname,
        uid: broadcaster.uid,
        ...report,
    };
}

export async function exportGiftReportCsvAction(startTime?: number, endTime?: number) {
    const broadcaster = await requireScannedBroadcaster();
    if (!broadcaster) {
        return { ok: false as const, message: '请先扫码' };
    }
    const file = await buildGiftStreamCsv(broadcaster.id, startTime, endTime);
    const uname = (broadcaster.uname || String(broadcaster.uid || 'report')).replace(/[\\/:*?"<>|]/g, '_');
    return { ok: true as const, filename: `${uname}-礼物流水.csv`, csv: file.csv };
}
