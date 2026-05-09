'use client';

import { useEffect } from 'react';
import Button from 'antd/es/button';
import Result from 'antd/es/result';
import Space from 'antd/es/space';

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
            <Result
                status="error"
                title={<span className="text-zinc-100">出错了</span>}
                subTitle={<span className="text-zinc-400">加载管理面板时遇到问题。</span>}
                extra={(
                    <Space>
                        <Button onClick={() => window.location.reload()}>刷新页面</Button>
                        <Button type="primary" onClick={() => reset()}>重试</Button>
                    </Space>
                )}
            >
                {error.digest && (
                    <p className="mt-4 text-xs text-zinc-600">Error Digest: {error.digest}</p>
                )}
            </Result>
        </div>
    );
}
