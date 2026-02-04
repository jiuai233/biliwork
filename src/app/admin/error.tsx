'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

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
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-black text-white">
            <h2 className="text-xl font-bold text-red-500">出错了</h2>
            <p className="text-zinc-400">加载管理面板时遇到问题。</p>
            <div className="flex gap-4">
                <Button variant="outline" onClick={() => window.location.reload()}>刷新页面</Button>
                <Button onClick={() => reset()}>重试</Button>
            </div>
            <p className="text-xs text-zinc-600 mt-4">Error Digest: {error.digest}</p>
        </div>
    );
}
