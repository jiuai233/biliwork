'use client';

import { useState, useTransition } from 'react';
import { Card, Table } from '@heroui/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Copy,
    Gauge,
    Eye,
    KeyRound,
    LogOut,
    PauseCircle,
    Pencil,
    PlayCircle,
    Plus,
    Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    createBroadcasterAction,
    toggleBroadcasterAction,
    deleteBroadcasterAction,
    updateBroadcasterPasswordAction,
    updateBroadcasterAuthCodeAction,
    changeAdminPasswordAction,
    adminLogout,
    revealBroadcasterAuthCodeAction,
} from '@/app/admin/actions';
import { Broadcaster, DashboardStats } from '@/lib/types';
import { PasswordDialog } from './PasswordDialog';

type BroadcasterWithStats = Broadcaster & { stats?: DashboardStats; isLive?: boolean };

const emptyStats: DashboardStats = {
    danmakuCount: 0,
    giftCount: 0,
    guardCount: 0,
    scCount: 0,
    totalIncome: 0,
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
    const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
    const [adminPwdOpen, setAdminPwdOpen] = useState(false);
    const [selectedBroadcasterId, setSelectedBroadcasterId] = useState<number | null>(null);
    const [openingDashboardId, setOpeningDashboardId] = useState<number | null>(null);
    const [authCodeDialogId, setAuthCodeDialogId] = useState<number | null>(null);
    const [authCodeEditId, setAuthCodeEditId] = useState<number | null>(null);
    const [newBroadcasterAuthCode, setNewBroadcasterAuthCode] = useState('');
    const [resetPasswordToAuthCode, setResetPasswordToAuthCode] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [authCodeError, setAuthCodeError] = useState('');
    const [revealedAuthCodes, setRevealedAuthCodes] = useState<Record<number, string>>({});

    const handleCopyAuthCode = async (authCode: string) => {
        try {
            await navigator.clipboard.writeText(authCode);
            toast.success('身份码已复制');
        } catch {
            window.prompt('复制身份码', authCode);
        }
    };

    const handleAdd = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!newAuthCode) return;

        const form = new FormData(event.currentTarget);

        startTransition(async () => {
            const result = await createBroadcasterAction(form);
            if (result.success) {
                toast.success('主播添加成功');
                setNewAuthCode('');
                window.location.reload();
            } else {
                toast.error(result.message);
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
                toast.success(currentStatus === 1 ? '已暂停' : '已启用');
            } else {
                toast.error('操作失败');
            }
        });
    };

    const handleDelete = (id: number) => {
        if (!window.confirm('确认删除该主播监控？数据会保留，但采集任务会停止。')) return;

        startTransition(async () => {
            const result = await deleteBroadcasterAction(id);
            if (result.success) {
                setBroadcasters((prev) => prev.filter((b) => b.id !== id));
                toast.success('删除成功');
            } else {
                toast.error('删除失败');
            }
        });
    };

    const handleOpenDashboard = async (id: number) => {
        const dashboardTab = window.open('about:blank', '_blank');
        if (!dashboardTab) {
            toast.error('浏览器阻止了新窗口，请允许弹窗后重试');
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
            toast.error('打开看板失败，请重新登录管理员后台后再试');
        } finally {
            setOpeningDashboardId(null);
        }
    };

    const handleOpenBroadcasterPage = (broadcaster: BroadcasterWithStats) => {
        const url = broadcaster.room_id
            ? `https://live.bilibili.com/${broadcaster.room_id}`
            : broadcaster.uid
                ? `https://space.bilibili.com/${broadcaster.uid}`
                : '';

        if (!url) {
            toast.error('暂无主播房间号或 UID，无法跳转');
            return;
        }

        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleRevealAuthCode = () => {
        if (!authCodeDialogId) return;
        if (!adminPassword) {
            setAuthCodeError('请输入管理员密码');
            return;
        }

        setAuthCodeError('');
        startTransition(async () => {
            const result = await revealBroadcasterAuthCodeAction(authCodeDialogId, adminPassword);
            if (result.success && result.authCode) {
                setRevealedAuthCodes((prev) => ({ ...prev, [authCodeDialogId]: result.authCode! }));
                setAdminPassword('');
                setAuthCodeDialogId(null);
                toast.success('身份码已显示');
            } else {
                setAuthCodeError(result.message || '验证失败');
            }
        });
    };

    const handleOpenAuthCodeEdit = (broadcaster: BroadcasterWithStats) => {
        setAuthCodeEditId(broadcaster.id);
        setNewBroadcasterAuthCode(broadcaster.auth_code || '');
        setResetPasswordToAuthCode(false);
        setAuthCodeError('');
    };

    const handleUpdateAuthCode = () => {
        if (!authCodeEditId) return;
        const authCode = newBroadcasterAuthCode.trim();
        if (!authCode) {
            setAuthCodeError('身份码不能为空');
            return;
        }

        setAuthCodeError('');
        startTransition(async () => {
            const result = await updateBroadcasterAuthCodeAction(
                authCodeEditId,
                authCode,
                resetPasswordToAuthCode
            );

            if (result.success) {
                const now = Date.now();
                setBroadcasters((prev) => prev.map((broadcaster) =>
                    broadcaster.id === authCodeEditId
                        ? { ...broadcaster, auth_code: authCode, updated_at: now }
                        : broadcaster
                ));
                setRevealedAuthCodes((prev) => {
                    const next = { ...prev };
                    delete next[authCodeEditId];
                    return next;
                });
                setAuthCodeEditId(null);
                setNewBroadcasterAuthCode('');
                setResetPasswordToAuthCode(false);
                toast.success(resetPasswordToAuthCode ? '身份码和登录密码已更新' : '身份码已更新');
            } else {
                const failureMessage = result.message || '更新失败';
                setAuthCodeError(failureMessage);
                toast.error(failureMessage);
            }
        });
    };

    const selectedAuthBroadcaster = authCodeDialogId
        ? broadcasters.find((b) => b.id === authCodeDialogId)
        : null;
    const selectedAuthEditBroadcaster = authCodeEditId
        ? broadcasters.find((b) => b.id === authCodeEditId)
        : null;

    return (
        <div className="min-h-screen bg-black p-8 text-zinc-100">
            <div className="mx-auto max-w-[1600px] space-y-6">
                <header className="flex flex-col gap-4 border-b border-zinc-800 pb-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-zinc-100">监控控制台</h1>
                        <p className="mt-1 text-sm text-zinc-400">管理您的 Bilibili 数据采集任务</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-zinc-200 hover:bg-white/[0.06]"
                            onClick={() => setAdminPwdOpen(true)}
                        >
                            <KeyRound className="h-4 w-4" />
                            修改管理员密码
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-500/40 px-4 text-red-300 hover:bg-red-500/10"
                            onClick={() => startTransition(() => adminLogout())}
                        >
                            <LogOut className="h-4 w-4" />
                            退出登录
                        </Button>
                    </div>
                </header>

                <Card variant="secondary" className="rounded-2xl border border-zinc-800 bg-zinc-950/70">
                    <Card.Content className="p-4">
                        <form onSubmit={handleAdd} className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0 flex-1 space-y-2 lg:max-w-[520px]">
                                <label htmlFor="authCode" className="block text-sm font-medium text-zinc-300">添加新主播</label>
                                <Input
                                    id="authCode"
                                    name="authCode"
                                    value={newAuthCode}
                                    onChange={(event) => setNewAuthCode(event.target.value)}
                                    placeholder="输入身份码添加监控..."
                                    className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] text-zinc-100 hover:bg-white/[0.06] focus:bg-white/[0.06]"
                                />
                            </div>
                            <Button
                                type="submit"
                                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-100 px-5 font-semibold text-zinc-950 hover:bg-white"
                                disabled={isPending || !newAuthCode.trim()}
                            >
                                <Plus className="h-4 w-4" />
                                初始化监控
                            </Button>
                        </form>
                    </Card.Content>
                </Card>

                <Card variant="secondary" className="overflow-hidden border border-zinc-800 bg-zinc-950/70">
                    <Table variant="secondary">
                        <Table.ScrollContainer className="overflow-x-auto">
                            <Table.Content
                                aria-label="主播监控列表"
                                className="w-full min-w-[1240px] table-fixed border-collapse bg-zinc-950 [&_tbody_tr]:border-b [&_tbody_tr]:border-zinc-800/70 [&_tbody_tr:hover]:bg-zinc-900/70 [&_td]:px-4 [&_td]:py-3 [&_th]:border-b [&_th]:border-zinc-800 [&_th]:bg-zinc-900 [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-zinc-300"
                            >
                                <Table.Header>
                                    <Table.Column id="status" isRowHeader className="w-[100px]">状态</Table.Column>
                                    <Table.Column id="profile" className="w-[280px]">主播信息</Table.Column>
                                    <Table.Column id="room" className="w-[180px]">身份码 / 房间号</Table.Column>
                                    <Table.Column id="stats" className="w-[150px]">今日流水</Table.Column>
                                    <Table.Column id="updated" className="w-[190px]">最后更新</Table.Column>
                                    <Table.Column id="actions" className="w-[340px] text-right">操作</Table.Column>
                                </Table.Header>
                                <Table.Body>
                                    {broadcasters.map((broadcaster) => {
                                        const stats = broadcaster.stats ?? emptyStats;
                                        const avatarSrc = normalizeAvatarSrc(broadcaster.uface);
                                        const revealedAuthCode = revealedAuthCodes[broadcaster.id];
                                        const canOpenBroadcasterPage = Boolean(broadcaster.room_id || broadcaster.uid);

                                        return (
                                            <Table.Row key={broadcaster.id} id={broadcaster.id}>
                                                <Table.Cell>
                                                    <div className="flex flex-col gap-2">
                                                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-200">
                                                            <span className={broadcaster.active ? 'h-2 w-2 rounded-full bg-emerald-400' : 'h-2 w-2 rounded-full bg-red-400'} />
                                                            <span className={broadcaster.active ? 'text-emerald-300' : 'text-red-300'}>
                                                                {broadcaster.active ? '监控中' : '已暂停'}
                                                            </span>
                                                        </span>
                                                        {broadcaster.isLive && (
                                                            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-300">
                                                                <span className="h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.85)]" />
                                                                直播中
                                                            </span>
                                                        )}
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            className={canOpenBroadcasterPage
                                                                ? "rounded-full transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
                                                                : "cursor-default rounded-full"
                                                            }
                                                            title={canOpenBroadcasterPage ? '打开主播页面' : '暂无主播跳转信息'}
                                                            aria-label={canOpenBroadcasterPage ? `打开 ${broadcaster.uname || '主播'} 页面` : '暂无主播跳转信息'}
                                                            onClick={() => handleOpenBroadcasterPage(broadcaster)}
                                                        >
                                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-900 text-sm font-semibold text-zinc-400">
                                                                {avatarSrc ? (
                                                                    // Bilibili avatar CDN may reject requests with a page Referer.
                                                                    <img
                                                                        src={avatarSrc}
                                                                        alt={broadcaster.uname || '主播头像'}
                                                                        className="h-full w-full object-cover"
                                                                        referrerPolicy="no-referrer"
                                                                    />
                                                                ) : (
                                                                    broadcaster.uname?.[0] || '?'
                                                                )}
                                                            </span>
                                                        </button>
                                                        <div>
                                                            <div className="flex min-w-0 items-center gap-2">
                                                                <span className="truncate font-medium text-zinc-100">{broadcaster.uname || '获取中...'}</span>
                                                                {broadcaster.isLive && (
                                                                    <span className="shrink-0 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">
                                                                        LIVE
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-sm text-zinc-500">UID: {broadcaster.uid || '-'}</div>
                                                        </div>
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <div>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="secondary"
                                                            className="inline-flex h-8 max-w-[170px] items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2 font-mono text-xs text-zinc-200 hover:bg-white/[0.08]"
                                                            onClick={() => {
                                                                if (revealedAuthCode) {
                                                                    void handleCopyAuthCode(revealedAuthCode);
                                                                    return;
                                                                }
                                                                setAuthCodeDialogId(broadcaster.id);
                                                                setAdminPassword('');
                                                                setAuthCodeError('');
                                                            }}
                                                        >
                                                            {revealedAuthCode ? <Copy className="h-3.5 w-3.5 shrink-0" /> : <Eye className="h-3.5 w-3.5 shrink-0" />}
                                                            <span
                                                                className="truncate"
                                                                title={revealedAuthCode ? '点击复制身份码' : '验证管理员密码后查看完整身份码'}
                                                            >
                                                                {revealedAuthCode || `${(broadcaster.auth_code || '').slice(0, 8)}...`}
                                                            </span>
                                                        </Button>
                                                        <div className="mt-1 text-sm text-zinc-500">Room: {broadcaster.room_id || '-'}</div>
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <div className="font-semibold text-yellow-400">¥{stats.totalIncome}</div>
                                                    <div className="text-xs text-zinc-500">
                                                        礼物 {stats.giftCount} / 舰长 {stats.guardCount}
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell className="text-zinc-500">
                                                    {new Date(broadcaster.updated_at).toLocaleString('zh-CN')}
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <div className="flex min-w-[308px] items-center justify-end gap-2 whitespace-nowrap">
                                                        {broadcaster.uid && broadcaster.room_id && (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                className="inline-flex h-9 min-w-[72px] shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-white hover:bg-blue-500 whitespace-nowrap"
                                                                disabled={openingDashboardId === broadcaster.id}
                                                                onClick={() => handleOpenDashboard(broadcaster.id)}
                                                            >
                                                                <Gauge className="h-4 w-4" />
                                                                {openingDashboardId === broadcaster.id ? '打开中' : '看板'}
                                                            </Button>
                                                        )}
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            aria-label="修改身份码"
                                                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 p-0 text-zinc-300 hover:bg-white/[0.06]"
                                                            onClick={() => handleOpenAuthCodeEdit(broadcaster)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            aria-label="修改主播密码"
                                                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 p-0 text-zinc-300 hover:bg-white/[0.06]"
                                                            onClick={() => {
                                                                setSelectedBroadcasterId(broadcaster.id);
                                                                setPwdDialogOpen(true);
                                                            }}
                                                        >
                                                            <KeyRound className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            className="inline-flex h-9 min-w-[78px] shrink-0 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 text-zinc-200 hover:bg-white/[0.06] whitespace-nowrap"
                                                            disabled={isPending}
                                                            onClick={() => handleToggle(broadcaster.id, broadcaster.active)}
                                                        >
                                                            {broadcaster.active ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                                                            {broadcaster.active ? '暂停' : '启用'}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            aria-label="删除主播"
                                                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-500/50 p-0 text-red-400 hover:bg-red-500/10"
                                                            disabled={isPending}
                                                            onClick={() => handleDelete(broadcaster.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </Table.Cell>
                                            </Table.Row>
                                        );
                                    })}
                                    {broadcasters.length === 0 && (
                                        <Table.Row id="empty">
                                            <Table.Cell colSpan={6} className="py-10 text-center text-zinc-500">
                                                暂无监控任务
                                            </Table.Cell>
                                        </Table.Row>
                                    )}
                                </Table.Body>
                            </Table.Content>
                        </Table.ScrollContainer>
                    </Table>
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

                {selectedAuthBroadcaster && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                        <button
                            type="button"
                            aria-label="关闭弹窗"
                            className="absolute inset-0"
                            onClick={() => {
                                if (isPending) return;
                                setAuthCodeDialogId(null);
                                setAdminPassword('');
                                setAuthCodeError('');
                            }}
                        />
                        <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl shadow-black/50">
                            <h2 className="text-xl font-bold text-zinc-100">查看身份码</h2>
                            <p className="mt-2 text-sm leading-6 text-zinc-400">
                                请输入管理员密码，验证后显示 {selectedAuthBroadcaster.uname || '该主播'} 的完整身份码。
                            </p>
                            {authCodeError && (
                                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                                    {authCodeError}
                                </div>
                            )}
                            <Input
                                value={adminPassword}
                                type="password"
                                onChange={(event) => {
                                    setAdminPassword(event.target.value);
                                    if (authCodeError) setAuthCodeError('');
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') handleRevealAuthCode();
                                }}
                                placeholder="输入管理员密码..."
                                autoComplete="current-password"
                                className="mt-4 h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] text-zinc-100 hover:bg-white/[0.06]"
                            />
                            <div className="mt-5 flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setAuthCodeDialogId(null);
                                        setAdminPassword('');
                                        setAuthCodeError('');
                                    }}
                                    disabled={isPending}
                                    className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 px-4 text-zinc-200 hover:bg-white/[0.06]"
                                >
                                    取消
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleRevealAuthCode}
                                    disabled={isPending || !adminPassword}
                                    className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-100 px-4 text-zinc-950 hover:bg-white"
                                >
                                    {isPending ? '验证中...' : '确认查看'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {selectedAuthEditBroadcaster && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                        <button
                            type="button"
                            aria-label="关闭弹窗"
                            className="absolute inset-0"
                            onClick={() => {
                                if (isPending) return;
                                setAuthCodeEditId(null);
                                setNewBroadcasterAuthCode('');
                                setResetPasswordToAuthCode(false);
                                setAuthCodeError('');
                            }}
                        />
                        <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl shadow-black/50">
                            <h2 className="text-xl font-bold text-zinc-100">修改身份码</h2>
                            <p className="mt-2 text-sm leading-6 text-zinc-400">
                                只会更新 {selectedAuthEditBroadcaster.uname || '该主播'} 的身份码配置，不会覆盖历史弹幕、礼物、SC 或开播记录。
                            </p>
                            {authCodeError && (
                                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                                    {authCodeError}
                                </div>
                            )}
                            <Input
                                value={newBroadcasterAuthCode}
                                onChange={(event) => {
                                    setNewBroadcasterAuthCode(event.target.value);
                                    if (authCodeError) setAuthCodeError('');
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') handleUpdateAuthCode();
                                }}
                                placeholder="输入新的身份码..."
                                autoComplete="off"
                                className="mt-4 h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] text-zinc-100 hover:bg-white/[0.06]"
                            />
                            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
                                <input
                                    type="checkbox"
                                    checked={resetPasswordToAuthCode}
                                    onChange={(event) => setResetPasswordToAuthCode(event.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-900"
                                />
                                <span>
                                    同时将主播登录密码重置为新身份码
                                    <span className="mt-1 block text-xs leading-5 text-zinc-500">
                                        不勾选时，主播登录密码保持不变。
                                    </span>
                                </span>
                            </label>
                            <div className="mt-5 flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setAuthCodeEditId(null);
                                        setNewBroadcasterAuthCode('');
                                        setResetPasswordToAuthCode(false);
                                        setAuthCodeError('');
                                    }}
                                    disabled={isPending}
                                    className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 px-4 text-zinc-200 hover:bg-white/[0.06]"
                                >
                                    取消
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleUpdateAuthCode}
                                    disabled={isPending || !newBroadcasterAuthCode.trim()}
                                    className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-100 px-4 text-zinc-950 hover:bg-white"
                                >
                                    {isPending ? '保存中...' : '保存'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
