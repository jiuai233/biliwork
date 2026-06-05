'use client';

import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DashboardNoticeDialogProps {
    open: boolean;
    dontShowAgain: boolean;
    onDontShowAgainChange: (checked: boolean) => void;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

export function DashboardNoticeDialog({
    open,
    dontShowAgain,
    onDontShowAgainChange,
    onOpenChange,
    onConfirm,
}: DashboardNoticeDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border-white/10 bg-zinc-950/80 text-zinc-100 shadow-2xl shadow-black/50 backdrop-blur-xl sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl text-zinc-100">问题反馈</DialogTitle>
                    <DialogDescription className="text-sm leading-6 text-zinc-400">
                        如果有问题请加QQ群：672791477
                    </DialogDescription>
                </DialogHeader>

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
                    <Checkbox
                        checked={dontShowAgain}
                        onCheckedChange={(checked) => onDontShowAgainChange(checked === true)}
                        className="border-zinc-500 data-[state=checked]:border-violet-400 data-[state=checked]:bg-violet-500"
                    />
                    不再提示
                </label>

                <DialogFooter>
                    <Button
                        type="button"
                        onClick={onConfirm}
                        className="h-10 rounded-lg bg-zinc-100 text-zinc-950 hover:bg-white"
                    >
                        知道了
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
