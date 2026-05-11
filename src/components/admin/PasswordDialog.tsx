'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface PasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    action: (password: string) => Promise<{ success: boolean; message?: string }>;
    successMessage?: string;
}

export function PasswordDialog({
    open,
    onOpenChange,
    title,
    description,
    action,
    successMessage = '操作成功',
}: PasswordDialogProps) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();

    const handleSubmit = () => {
        if (!password) {
            setError('请输入新密码');
            return;
        }

        setError('');

        startTransition(async () => {
            const result = await action(password);
            if (result.success) {
                toast.success(successMessage);
                setPassword('');
                setError('');
                onOpenChange(false);
            } else {
                const failureMessage = result.message || '操作失败';
                setError(failureMessage);
                toast.error(failureMessage);
            }
        });
    };

    const handleCancel = () => {
        if (isPending) return;
        setPassword('');
        setError('');
        onOpenChange(false);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
            <button
                type="button"
                aria-label="关闭弹窗"
                className="absolute inset-0"
                onClick={handleCancel}
            />
            <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl shadow-black/50">
                <h2 className="text-xl font-bold text-zinc-100">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
                {error && (
                    <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                        {error}
                    </div>
                )}
                <Input
                    value={password}
                    type="password"
                    onChange={(event) => {
                        setPassword(event.target.value);
                        if (error) setError('');
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') handleSubmit();
                    }}
                    placeholder="输入新密码..."
                    autoComplete="new-password"
                    className="mt-4 h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] text-zinc-100 hover:bg-white/[0.06]"
                />
                <div className="mt-5 flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isPending}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 px-4 text-zinc-200 hover:bg-white/[0.06]"
                    >
                        取消
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isPending || !password}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-100 px-4 text-zinc-950 hover:bg-white"
                    >
                        {isPending ? '修改中...' : '确认修改'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
