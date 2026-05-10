'use client';

import { useEffect } from 'react';
import { Button, Card } from '@heroui/react';
import { AlertTriangle } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Admin Error:', error);
    }, [error]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-black text-white">
            <Card variant="secondary" className="w-full max-w-md border border-zinc-800 bg-zinc-950">
                <Card.Content className="p-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <h1 className="mt-4 text-xl font-semibold text-zinc-100">出错了</h1>
                    <p className="mt-2 text-sm text-zinc-400">加载管理面板时遇到问题。</p>
                    <div className="mt-5 flex justify-center gap-2">
                        <Button variant="outline" className="border-zinc-700 text-zinc-200" onClick={() => window.location.reload()}>
                            刷新页面
                        </Button>
                        <Button variant="primary" className="bg-blue-600 text-white hover:bg-blue-500" onClick={() => reset()}>
                            重试
                        </Button>
                    </div>
                {error.digest && (
                    <p className="mt-4 text-xs text-zinc-600">Error Digest: {error.digest}</p>
                )}
                </Card.Content>
            </Card>
        </div>
    );
}
