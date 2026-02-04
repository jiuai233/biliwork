'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface PasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    action: (password: string) => Promise<{ success: boolean; message?: string }>;
    successMessage?: string;
}

export function PasswordDialog({ open, onOpenChange, title, description, action, successMessage = '操作成功' }: PasswordDialogProps) {
    const [password, setPassword] = useState('');
    const [isPending, startTransition] = useTransition();

    const handleSubmit = () => {
        if (!password) return;
        startTransition(async () => {
            const result = await action(password);
            if (result.success) {
                toast.success(successMessage);
                setPassword('');
                onOpenChange(false);
            } else {
                toast.error(result.message || '操作失败');
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Input
                        type="text"
                        placeholder="输入新密码..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-zinc-800 border-zinc-700"
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
                    <Button onClick={handleSubmit} disabled={isPending || !password}>确认修改</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
