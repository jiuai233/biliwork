'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { AdminModal } from './AdminModal';

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
        <AdminModal
            title={title}
            description={description}
            error={error}
            confirmLabel="确认修改"
            pendingLabel="修改中..."
            isPending={isPending}
            confirmDisabled={!password}
            onConfirm={handleSubmit}
            onClose={handleCancel}
        >
            <label className="mt-4 block space-y-1 text-sm">
                <span className="text-muted-foreground">新密码</span>
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
                    placeholder="至少 6 位"
                    autoComplete="new-password"
                    className="h-10 w-full rounded-xl"
                    aria-invalid={error ? true : undefined}
                />
            </label>
        </AdminModal>
    );
}
