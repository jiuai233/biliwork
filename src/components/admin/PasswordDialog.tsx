'use client';

import { useState, useTransition } from 'react';
import AntApp from 'antd/es/app';
import Alert from 'antd/es/alert';
import Input from 'antd/es/input';
import Modal from 'antd/es/modal';

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
    const { message } = AntApp.useApp();

    const handleSubmit = () => {
        if (!password) {
            setError('请输入新密码');
            return;
        }

        setError('');

        startTransition(async () => {
            const result = await action(password);
            if (result.success) {
                message.success(successMessage);
                setPassword('');
                setError('');
                onOpenChange(false);
            } else {
                const failureMessage = result.message || '操作失败';
                setError(failureMessage);
                message.error(failureMessage);
            }
        });
    };

    const handleCancel = () => {
        if (isPending) return;
        setPassword('');
        setError('');
        onOpenChange(false);
    };

    return (
        <Modal
            title={title}
            open={open}
            onCancel={handleCancel}
            onOk={handleSubmit}
            okText="确认修改"
            cancelText="取消"
            confirmLoading={isPending}
            okButtonProps={{ disabled: !password }}
            destroyOnHidden
        >
            <p className="mb-4 text-sm text-zinc-400">{description}</p>
            {error && (
                <Alert className="mb-4" type="error" showIcon message={error} />
            )}
            <Input.Password
                value={password}
                onChange={(event) => {
                    setPassword(event.target.value);
                    if (error) setError('');
                }}
                onPressEnter={handleSubmit}
                placeholder="输入新密码..."
                autoComplete="new-password"
            />
        </Modal>
    );
}
