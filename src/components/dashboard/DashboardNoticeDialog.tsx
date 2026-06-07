'use client';

import { Copy, ExternalLink, MessageCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const QQ_GROUP_NUMBER = '672791477';
const QQ_GROUP_INVITE_URL = 'https://qm.qq.com/q/XrBYAZ4aMc';

interface DashboardNoticeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

export function DashboardNoticeDialog({
    open,
    onOpenChange,
    onConfirm,
}: DashboardNoticeDialogProps) {
    const copyGroupNumber = async () => {
        try {
            await navigator.clipboard.writeText(QQ_GROUP_NUMBER);
            toast.success('QQ群号已复制');
        } catch {
            toast.error(`复制失败，请手动搜索群号 ${QQ_GROUP_NUMBER}`);
        }
    };

    const openInviteLink = async () => {
        try {
            await navigator.clipboard.writeText(QQ_GROUP_NUMBER);
        } catch { }

        window.open(QQ_GROUP_INVITE_URL, '_blank', 'noopener,noreferrer');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border-sky-300/20 bg-zinc-950 text-zinc-100 shadow-2xl shadow-black/70 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-zinc-100">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-300/20 bg-sky-400/10 text-sky-200">
                            <MessageCircle className="h-4 w-4" />
                        </span>
                        问题反馈
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-6 text-zinc-400">
                        遇到问题可以加入 QQ 群反馈。点击下方按钮会打开官方加群链接；如果浏览器拦截，请复制群号手动搜索。
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="text-xs font-medium text-zinc-500">QQ群号</div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                        <div className="text-2xl font-black tracking-normal text-zinc-100">{QQ_GROUP_NUMBER}</div>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={copyGroupNumber}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm text-zinc-200 hover:bg-white/[0.09]"
                        >
                            <Copy className="h-4 w-4" />
                            复制
                        </Button>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:justify-between">
                    <Button
                        type="button"
                        onClick={openInviteLink}
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-sky-500 text-white hover:bg-sky-400"
                    >
                        <ExternalLink className="h-4 w-4" />
                        打开加群链接
                    </Button>
                    <Button
                        type="button"
                        onClick={onConfirm}
                        variant="secondary"
                        className="h-10 rounded-lg border border-white/10 bg-white/[0.06] text-zinc-100 hover:bg-white/[0.09]"
                    >
                        知道了
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
