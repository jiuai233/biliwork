
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { loginAction } from './actions';
import { toast } from 'sonner';

export default function LoginPage() {
    const [uid, setUid] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await loginAction(Number(uid), password);
            if (result.success) {
                toast.success('登录成功');
                window.location.replace('/dashboard');
            } else {
                toast.error('登录失败', { description: 'UID 或 密码错误' });
            }
        } catch {
            toast.error('发生错误', { description: '请稍后重试' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-500/20 blur-[120px] rounded-full mix-blend-screen animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 blur-[120px] rounded-full mix-blend-screen animate-pulse delay-1000" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="z-10 w-full max-w-md"
            >
                <Card className="border-zinc-800 bg-zinc-900/50 shadow-2xl backdrop-blur-xl">
                    <CardHeader className="space-y-1 px-6 pt-6">
                        <CardTitle className="text-center text-2xl font-bold leading-tight bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                            Bilibili Live Monitor
                        </CardTitle>
                        <CardDescription className="text-center text-zinc-400">
                            请输入您的 UID 和 登录密码
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-4">
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="uid" className="text-sm font-medium text-zinc-300">UID</label>
                                <Input
                                    id="uid"
                                    placeholder="请输入 B站 UID"
                                    type="text"
                                    value={uid}
                                    onChange={(e) => setUid(e.target.value)}
                                    className="h-10 rounded-md border border-zinc-700 bg-zinc-800/50 text-zinc-100 transition-colors focus:border-purple-500"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium text-zinc-300">密码</label>
                                <Input
                                    id="password"
                                    placeholder="请输入您的登录密码"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-10 rounded-md border border-zinc-700 bg-zinc-800/50 text-zinc-100 transition-colors focus:border-purple-500"
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-900/20 hover:from-purple-500 hover:to-blue-500"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        登录中...
                                    </>
                                ) : (
                                    '登 录'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
