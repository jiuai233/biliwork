'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface AdminModalProps {
    title: string;
    description: React.ReactNode;
    error?: string;
    confirmLabel: string;
    pendingLabel: string;
    isPending: boolean;
    confirmDisabled?: boolean;
    onConfirm: () => void;
    onClose: () => void;
    children?: React.ReactNode;
}

export function AdminModal({
    title,
    description,
    error,
    confirmLabel,
    pendingLabel,
    isPending,
    confirmDisabled,
    onConfirm,
    onClose,
    children,
}: AdminModalProps) {
    return (
        <Dialog open onOpenChange={(open) => {
            if (!open && !isPending) onClose();
        }}>
            <DialogContent
                showCloseButton={false}
                onEscapeKeyDown={(event) => {
                    if (isPending) event.preventDefault();
                }}
                onPointerDownOutside={(event) => {
                    if (isPending) event.preventDefault();
                }}
                className="max-w-md rounded-2xl border-border bg-popover p-5 shadow-2xl shadow-black/50"
            >
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-foreground">{title}</DialogTitle>
                    <DialogDescription className="text-sm leading-6 text-muted-foreground">{description}</DialogDescription>
                </DialogHeader>
                {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                        {error}
                    </div>
                )}
                {children}
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose} disabled={isPending} className="h-10 rounded-xl border-border px-4 text-secondary-foreground hover:bg-accent">
                        取消
                    </Button>
                    <Button type="button" onClick={onConfirm} disabled={isPending || confirmDisabled} className="h-10 rounded-xl bg-primary px-4 text-primary-foreground hover:bg-primary/90">
                        {isPending ? pendingLabel : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
