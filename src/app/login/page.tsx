
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { loginAction } from './actions';
import { toast } from 'sonner';

export default function LoginPage() {
    const [uid, setUid] = useState('');
    const [authCode, setAuthCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await loginAction(Number(uid), authCode);
            if (result.success) {
                toast.success('登录成功');
                router.push('/dashboard');
            } else {
                toast.error('登录失败', { description: 'UID 或 身份码错误' });
            }
        } catch (error) {
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
                <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-xl shadow-2xl">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                            Bilibili Live Monitor
                        </CardTitle>
                        <CardDescription className="text-center text-zinc-400">
                            请输入您的 UID 和 身份码进行登录
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="uid" className="text-zinc-300">UID</Label>
                                <Input
                                    id="uid"
                                    placeholder="请输入 B站 UID"
                                    type="text"
                                    value={uid}
                                    onChange={(e) => setUid(e.target.value)}
                                    className="bg-zinc-800/50 border-zinc-700 text-zinc-100 focus:border-purple-500 transition-colors"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="authCode" className="text-zinc-300">身份码</Label>
                                <Input
                                    id="authCode"
                                    placeholder="请输入您的直播身份码"
                                    type="password"
                                    value={authCode}
                                    onChange={(e) => setAuthCode(e.target.value)}
                                    className="bg-zinc-800/50 border-zinc-700 text-zinc-100 focus:border-purple-500 transition-colors"
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium shadow-lg shadow-purple-900/20"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        登录中...
                                    </>
                                ) : (
                                    '登 录'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex justify-center">

                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
