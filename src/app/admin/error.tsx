'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
        <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
            <Card className="w-full max-w-md border-border bg-card">
                <CardContent className="p-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <h1 className="mt-4 text-xl font-semibold text-foreground">出错了</h1>
                    <p className="mt-2 text-sm text-muted-foreground">加载管理面板时遇到问题。</p>
                    <div className="mt-5 flex justify-center gap-2">
                        <Button variant="outline" className="border-border text-secondary-foreground" onClick={() => window.location.reload()}>
                            刷新页面
                        </Button>
                        <Button className="bg-primary text-white hover:bg-primary/90" onClick={() => reset()}>
                            重试
                        </Button>
                    </div>
                {error.digest && (
                    <p className="mt-4 text-xs text-muted-foreground/60">Error Digest: {error.digest}</p>
                )}
                </CardContent>
            </Card>
        </div>
    );
}
