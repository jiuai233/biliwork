'use client';

import { useState, useTransition } from 'react';
import AntApp from 'antd/es/app';
import Avatar from 'antd/es/avatar';
import Button from 'antd/es/button';
import Card from 'antd/es/card';
import Input from 'antd/es/input';
import Popconfirm from 'antd/es/popconfirm';
import Space from 'antd/es/space';
import Table from 'antd/es/table';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import type { ColumnsType } from 'antd/es/table';
import DashboardOutlined from '@ant-design/icons/es/icons/DashboardOutlined';
import DeleteOutlined from '@ant-design/icons/es/icons/DeleteOutlined';
import KeyOutlined from '@ant-design/icons/es/icons/KeyOutlined';
import LogoutOutlined from '@ant-design/icons/es/icons/LogoutOutlined';
import PauseCircleOutlined from '@ant-design/icons/es/icons/PauseCircleOutlined';
import PlayCircleOutlined from '@ant-design/icons/es/icons/PlayCircleOutlined';
import PlusOutlined from '@ant-design/icons/es/icons/PlusOutlined';
import {
    createBroadcasterAction,
    toggleBroadcasterAction,
    deleteBroadcasterAction,
    updateBroadcasterPasswordAction,
    changeAdminPasswordAction,
    adminLogout,
} from '@/app/admin/actions';
import { Broadcaster, DashboardStats } from '@/lib/types';
import { PasswordDialog } from './PasswordDialog';

type BroadcasterWithStats = Broadcaster & { stats?: DashboardStats };

const { Text, Title } = Typography;
const emptyStats: DashboardStats = {
    danmakuCount: 0,
    giftCount: 0,
    guardCount: 0,
    scCount: 0,
    totalIncome: 0
};

function normalizeAvatarSrc(src: string | null): string | undefined {
    if (!src) return undefined;
    if (src.startsWith('//')) return `https:${src}`;
    if (src.startsWith('http://')) return src.replace(/^http:\/\//, 'https://');
    return src;
}

export default function BroadcasterManager({ initialBroadcasters }: { initialBroadcasters: BroadcasterWithStats[] }) {
    const [broadcasters, setBroadcasters] = useState<BroadcasterWithStats[]>(initialBroadcasters);
    const [newAuthCode, setNewAuthCode] = useState('');
    const [isPending, startTransition] = useTransition();
    const { message } = AntApp.useApp();

    const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
    const [adminPwdOpen, setAdminPwdOpen] = useState(false);
    const [selectedBroadcasterId, setSelectedBroadcasterId] = useState<number | null>(null);
    const [openingDashboardId, setOpeningDashboardId] = useState<number | null>(null);

    const handleAdd = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!newAuthCode) return;

        startTransition(async () => {
            const result = await createBroadcasterAction(new FormData(event.currentTarget));
            if (result.success) {
                message.success('主播添加成功');
                setNewAuthCode('');
                window.location.reload();
            } else {
                message.error(result.message);
            }
        });
    };

    const handleToggle = (id: number, currentStatus: number) => {
        startTransition(async () => {
            const result = await toggleBroadcasterAction(id, currentStatus);
            if (result.success) {
                setBroadcasters((prev) => prev.map((b) =>
                    b.id === id ? { ...b, active: currentStatus === 1 ? 0 : 1 } : b
                ));
                message.success(currentStatus === 1 ? '已暂停' : '已启用');
            } else {
                message.error('操作失败');
            }
        });
    };

    const handleDelete = (id: number) => {
        startTransition(async () => {
            const result = await deleteBroadcasterAction(id);
            if (result.success) {
                setBroadcasters((prev) => prev.filter((b) => b.id !== id));
                message.success('删除成功');
            } else {
                message.error('删除失败');
            }
        });
    };

    const handleOpenDashboard = async (id: number) => {
        const dashboardTab = window.open('about:blank', '_blank');
        if (!dashboardTab) {
            message.error('浏览器阻止了新窗口，请允许弹窗后重试');
            return;
        }

        setOpeningDashboardId(id);

        try {
            const response = await fetch(`/admin/impersonate/${id}?format=json`, {
                cache: 'no-store',
                credentials: 'same-origin',
                headers: { Accept: 'application/json' },
            });

            if (!response.ok) {
                throw new Error('impersonate failed');
            }

            const result = await response.json() as { redirectTo?: string };
            dashboardTab.location.href = result.redirectTo || '/dashboard';
            dashboardTab.opener = null;
        } catch {
            dashboardTab.close();
            message.error('打开看板失败，请重新登录管理员后台后再试');
        } finally {
            setOpeningDashboardId(null);
        }
    };

    const columns: ColumnsType<BroadcasterWithStats> = [
        {
            title: '状态',
            dataIndex: 'active',
            key: 'active',
            width: 100,
            render: (active: number) => (
                active ? <Tag color="success">监控中</Tag> : <Tag color="error">已暂停</Tag>
            ),
        },
        {
            title: '主播信息',
            key: 'profile',
            render: (_, broadcaster) => {
                const avatarSrc = normalizeAvatarSrc(broadcaster.uface);

                return (
                    <Space>
                        <Avatar
                            src={avatarSrc ? (
                                // Bilibili avatar URLs can reject hotlinked requests with a referrer.
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={avatarSrc}
                                    alt={broadcaster.uname || '主播头像'}
                                    referrerPolicy="no-referrer"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : undefined}
                        >
                            {broadcaster.uname?.[0] || '?'}
                        </Avatar>
                        <div>
                            <div className="font-medium text-zinc-100">
                                {broadcaster.uname || '获取中...'}
                            </div>
                            <Text type="secondary">UID: {broadcaster.uid || '-'}</Text>
                        </div>
                    </Space>
                );
            },
        },
        {
            title: '身份码 / 房间号',
            key: 'room',
            render: (_, broadcaster) => (
                <div>
                    <Text code>{broadcaster.auth_code.slice(0, 8)}...</Text>
                    <div className="mt-1">
                        <Text type="secondary">Room: {broadcaster.room_id || '-'}</Text>
                    </div>
                </div>
            ),
        },
        {
            title: '今日流水',
            key: 'stats',
            render: (_, broadcaster) => {
                const stats = broadcaster.stats ?? emptyStats;

                return (
                    <div>
                        <div className="font-semibold text-yellow-400">¥{stats.totalIncome}</div>
                        <Text type="secondary">
                            礼物 {stats.giftCount} / 舰长 {stats.guardCount}
                        </Text>
                    </div>
                );
            },
        },
        {
            title: '最后更新',
            dataIndex: 'updated_at',
            key: 'updated_at',
            render: (updatedAt: number) => (
                <Text type="secondary">{new Date(updatedAt).toLocaleString('zh-CN')}</Text>
            ),
        },
        {
            title: '操作',
            key: 'actions',
            align: 'right',
            render: (_, broadcaster) => (
                <Space size="small">
                    {broadcaster.uid && broadcaster.room_id && (
                        <Button
                            size="small"
                            type="primary"
                            icon={<DashboardOutlined />}
                            loading={openingDashboardId === broadcaster.id}
                            onClick={() => handleOpenDashboard(broadcaster.id)}
                        >
                            看板
                        </Button>
                    )}
                    <Button
                        size="small"
                        icon={<KeyOutlined />}
                        onClick={() => {
                            setSelectedBroadcasterId(broadcaster.id);
                            setPwdDialogOpen(true);
                        }}
                    />
                    <Button
                        size="small"
                        icon={broadcaster.active ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                        loading={isPending}
                        onClick={() => handleToggle(broadcaster.id, broadcaster.active)}
                    >
                        {broadcaster.active ? '暂停' : '启用'}
                    </Button>
                    <Popconfirm
                        title="确认删除该主播监控？"
                        description="数据将保留，但采集任务会停止。"
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDelete(broadcaster.id)}
                    >
                        <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            loading={isPending}
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-black p-8 text-zinc-100">
            <div className="mx-auto max-w-7xl space-y-6">
                <header className="flex flex-col gap-4 border-b border-zinc-800 pb-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <Title level={2} className="!mb-1 !text-zinc-100">
                            监控控制台
                        </Title>
                        <Text type="secondary">管理您的 Bilibili 数据采集任务</Text>
                    </div>
                    <Space wrap>
                        <Button
                            icon={<KeyOutlined />}
                            onClick={() => setAdminPwdOpen(true)}
                        >
                            修改管理员密码
                        </Button>
                        <Button
                            danger
                            icon={<LogoutOutlined />}
                            onClick={() => startTransition(() => adminLogout())}
                        >
                            退出登录
                        </Button>
                    </Space>
                </header>

                <Card>
                    <form onSubmit={handleAdd} className="flex flex-col gap-3 md:flex-row md:items-end">
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium text-zinc-300">添加新主播</label>
                            <Input
                                name="authCode"
                                value={newAuthCode}
                                onChange={(event) => setNewAuthCode(event.target.value)}
                                placeholder="输入身份码添加监控..."
                                size="large"
                            />
                        </div>
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            icon={<PlusOutlined />}
                            loading={isPending}
                            disabled={!newAuthCode}
                        >
                            初始化监控
                        </Button>
                    </form>
                </Card>

                <Card className="overflow-hidden">
                    <Table<BroadcasterWithStats>
                        rowKey="id"
                        columns={columns}
                        dataSource={broadcasters}
                        pagination={false}
                        loading={isPending && broadcasters.length === 0}
                        locale={{ emptyText: '暂无监控任务' }}
                        scroll={{ x: 960 }}
                    />
                </Card>

                <PasswordDialog
                    open={pwdDialogOpen}
                    onOpenChange={setPwdDialogOpen}
                    title="修改主播密码"
                    description="请为该主播设置一个新的登录密码。修改后主播下次登录需使用新密码。"
                    action={(pwd) => selectedBroadcasterId
                        ? updateBroadcasterPasswordAction(selectedBroadcasterId, pwd)
                        : Promise.resolve({ success: false })
                    }
                />

                <PasswordDialog
                    open={adminPwdOpen}
                    onOpenChange={setAdminPwdOpen}
                    title="修改管理员密码"
                    description="请为您当前的管理员账户设置一个新的密码。修改后您下次登录需使用新密码。"
                    action={(pwd) => changeAdminPasswordAction(pwd)}
                    successMessage="管理员密码修改成功"
                />
            </div>
        </div>
    );
}
