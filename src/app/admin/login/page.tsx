'use client';

import { useActionState } from 'react';
import { adminLogin } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
                <Card className="w-[350px] border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                            Admin Console
                        </CardTitle>
                        <CardDescription className="text-zinc-500">
                            管理后台登录
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={formAction} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">用户名</Label>
                                <Input
                                    id="username"
                                    name="username"
                                    placeholder="admin"
                                    className="bg-zinc-800/50 border-zinc-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">密码</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="••••••"
                                    className="bg-zinc-800/50 border-zinc-700"
                                />
                            </div>

                            {state?.message && (
                                <p className="text-sm text-red-400 text-center">
                                    {state.message}
                                </p>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-500"
                                disabled={isPending}
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
