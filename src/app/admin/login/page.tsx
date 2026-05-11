'use client';

import { useActionState } from 'react';
import { adminLogin } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Lock, User } from 'lucide-react';
import { motion } from 'framer-motion';

const initialState = {
    message: '',
};

export default function AdminLoginPage() {
    const [state, formAction, isPending] = useActionState(adminLogin, initialState);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-black/95 text-zinc-100">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Card className="w-[380px] max-w-[calc(100vw-2rem)] rounded-lg border-white/10 bg-zinc-950/90 shadow-2xl shadow-black/40">
                    <CardContent className="p-7">
                        <div className="mb-7 text-center">
                            <h1 className="mb-1 text-2xl font-extrabold text-zinc-100">Admin Console</h1>
                            <p className="text-sm text-zinc-400">管理后台登录</p>
                        </div>

                        <form action={formAction} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="username" className="text-sm text-zinc-300">
                                    用户名
                                </label>
                                <div className="relative">
                                    <User className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                                    <Input
                                        id="username"
                                        name="username"
                                        placeholder="admin"
                                        autoComplete="username"
                                        className="h-11 rounded-md border border-white/10 bg-white/[0.04] pl-9 text-zinc-100 hover:bg-white/[0.06] focus:bg-white/[0.06]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm text-zinc-300">
                                    密码
                                </label>
                                <div className="relative">
                                    <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="请输入密码"
                                        autoComplete="current-password"
                                        className="h-11 rounded-md border border-white/10 bg-white/[0.04] pl-9 text-zinc-100 hover:bg-white/[0.06] focus:bg-white/[0.06]"
                                    />
                                </div>
                            </div>

                            {state?.message && (
                                <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                                    {state.message}
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={isPending}
                                className="h-11 w-full rounded-md bg-zinc-100 text-base font-semibold text-zinc-950 hover:bg-white"
                            >
                                {isPending ? '登录中...' : '进入后台'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
