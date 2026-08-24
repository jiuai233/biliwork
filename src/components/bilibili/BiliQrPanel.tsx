'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type QrPhase = 'idle' | 'loading' | 'pending' | 'scanned' | 'expired' | 'success' | 'unregistered' | 'mismatch' | 'error';

type GenerateResult = { ok: true; url: string; qrcodeKey: string } | { ok: false; message: string };
type PollResult = { phase: QrPhase; message: string };

interface BiliQrPanelProps {
    generate: () => Promise<GenerateResult>;
    poll: (qrcodeKey: string) => Promise<PollResult>;
    onSuccess?: () => void;
    autoStart?: boolean;
    className?: string;
}

export function BiliQrPanel({ generate, poll, onSuccess, autoStart = false, className }: BiliQrPanelProps) {
    const [phase, setPhase] = useState<QrPhase>('idle');
    const [message, setMessage] = useState('点击下方按钮获取二维码');
    const [qr, setQr] = useState<{ url: string; qrcodeKey: string } | null>(null);
    const autoStarted = useRef(false);

    const start = useCallback(async () => {
        setPhase('loading');
        setMessage('正在获取二维码…');
        setQr(null);
        const result = await generate();
        if (!result.ok) {
            setPhase('error');
            setMessage(result.message);
            return;
        }
        setQr({ url: result.url, qrcodeKey: result.qrcodeKey });
        setPhase('pending');
        setMessage('请用哔哩哔哩 App 扫码');
    }, [generate]);

    useEffect(() => {
        if (!autoStart || autoStarted.current) return;
        autoStarted.current = true;
        void start();
    }, [autoStart, start]);

    useEffect(() => {
        if (!qr || (phase !== 'pending' && phase !== 'scanned')) return;
        let cancelled = false;
        let busy = false;
        const timer = setInterval(async () => {
            if (busy) return;
            busy = true;
            try {
                const result = await poll(qr.qrcodeKey);
                if (cancelled) return;
                if (result.phase === 'pending') {
                    setPhase('pending');
                    setMessage('请用哔哩哔哩 App 扫码');
                    return;
                }
                if (result.phase === 'scanned') {
                    setPhase('scanned');
                    setMessage('已扫码，请在手机上确认');
                    return;
                }
                setPhase(result.phase);
                setMessage(result.message);
                if (result.phase === 'success') onSuccess?.();
            } finally {
                busy = false;
            }
        }, 2000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [qr, phase, poll, onSuccess]);

    return (
        <div className={cn('space-y-4', className)}>
            <div className="rounded-lg border border-primary/25 bg-primary/10 px-3.5 py-3 text-left">
                <p className="text-sm font-semibold text-primary">扫码时请选「在公共环境登录」</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    手机确认登录时，务必点「在公共环境登录，如网吧等」。选普通登录可能挤掉你自己设备上的登录态。
                </p>
            </div>

            <div className="flex flex-col items-center gap-3">
                <div className="flex h-[220px] w-[220px] items-center justify-center rounded-xl border border-border bg-card p-3">
                    {phase === 'success' ? (
                        <div className="text-center text-sm font-semibold text-profit">{message}</div>
                    ) : qr ? (
                        <QRCodeSVG value={qr.url} size={196} level="M" includeMargin={false} />
                    ) : phase === 'loading' ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    ) : (
                        <QrCode className="h-10 w-10 text-muted-foreground" />
                    )}
                </div>
                {phase !== 'success' && (
                    <p className="max-w-xs text-center text-sm text-muted-foreground">{message}</p>
                )}
                <Button
                    type="button"
                    onClick={() => void start()}
                    disabled={phase === 'loading'}
                    className="h-10 rounded-lg"
                >
                    {qr && phase !== 'success' ? '刷新二维码' : '获取登录二维码'}
                </Button>
            </div>
        </div>
    );
}
