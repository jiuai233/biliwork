'use client';

import { useActionState } from 'react';
import { adminLogin } from '../actions';
import Alert from 'antd/es/alert';
import Button from 'antd/es/button';
import Card from 'antd/es/card';
import Input from 'antd/es/input';
import Typography from 'antd/es/typography';
import LockOutlined from '@ant-design/icons/es/icons/LockOutlined';
import UserOutlined from '@ant-design/icons/es/icons/UserOutlined';
import { motion } from 'framer-motion';

const initialState = {
    message: '',
};

const { Text, Title } = Typography;

export default function AdminLoginPage() {
    const [state, formAction, isPending] = useActionState(adminLogin, initialState);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-black/95 text-zinc-100">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Card className="w-[360px] border border-zinc-800 shadow-2xl shadow-black/30">
                    <div className="mb-6 text-center">
                        <Title level={4} className="!mb-1 !text-zinc-100">
                            Admin Console
                        </Title>
                        <Text type="secondary">管理后台登录</Text>
                    </div>

                    <form action={formAction} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="username" className="text-sm text-zinc-300">
                                用户名
                            </label>
                            <Input
                                id="username"
                                name="username"
                                size="large"
                                prefix={<UserOutlined />}
                                placeholder="admin"
                                autoComplete="username"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm text-zinc-300">
                                密码
                            </label>
                            <Input.Password
                                id="password"
                                name="password"
                                size="large"
                                prefix={<LockOutlined />}
                                placeholder="请输入密码"
                                autoComplete="current-password"
                            />
                        </div>

                        {state?.message && (
                            <Alert type="error" showIcon message={state.message} />
                        )}

                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            block
                            loading={isPending}
                        >
                            进入后台
                        </Button>
                    </form>
                </Card>
            </motion.div>
        </div>
    );
}
