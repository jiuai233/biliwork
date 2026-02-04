'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Play, Pause, Plus, LogOut, Key } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
    createBroadcasterAction,
    toggleBroadcasterAction,
    deleteBroadcasterAction,
    updateBroadcasterPasswordAction,
    changeAdminPasswordAction,
    adminLogout
} from '@/app/admin/actions';
import { Broadcaster, DashboardStats } from '@/lib/types';
import { cn } from '@/lib/utils';
import { PasswordDialog } from './PasswordDialog';

type BroadcasterWithStats = Broadcaster & { stats?: DashboardStats };

export default function BroadcasterManager({ initialBroadcasters }: { initialBroadcasters: BroadcasterWithStats[] }) {
    const [broadcasters, setBroadcasters] = useState<BroadcasterWithStats[]>(initialBroadcasters);
    const [newAuthCode, setNewAuthCode] = useState('');
    const [isPending, startTransition] = useTransition();

    // Dialog State
    const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
    const [adminPwdOpen, setAdminPwdOpen] = useState(false);
    const [selectedBroadcasterId, setSelectedBroadcasterId] = useState<number | null>(null);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAuthCode) return;

        startTransition(async () => {
            const result = await createBroadcasterAction(new FormData(e.target as HTMLFormElement));
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
                setBroadcasters(prev => prev.map(b =>
                    b.id === id ? { ...b, active: currentStatus === 1 ? 0 : 1 } : b
                ));
                toast.success(currentStatus === 1 ? '已暂停' : '已启用');
            } else {
                toast.error('操作失败');
            }
        });
    };

    const handleDelete = (id: number) => {
        if (!confirm('确认删除该主播监控？数据将保留但停止采集。')) return;

        startTransition(async () => {
            const result = await deleteBroadcasterAction(id);
            if (result.success) {
                setBroadcasters(prev => prev.filter(b => b.id !== id));
                toast.success('删除成功');
            } else {
                toast.error('删除失败');
            }
        });
    };

    return (
        <div className="min-h-screen bg-black text-zinc-100 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex items-center justify-between border-b border-zinc-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                            监控控制台
                        </h1>
                        <p className="text-zinc-500 mt-2">管理您的 Bilibili 数据采集任务</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setAdminPwdOpen(true)}
                            className="text-zinc-400 border-zinc-800 hover:bg-zinc-800"
                        >
                            <Key className="w-4 h-4 mr-2" />
                            修改管理员密码
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => startTransition(() => adminLogout())}
                            className="text-red-400 border-red-900/50 hover:bg-red-950/30"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            退出登录
                        </Button>
                    </div>
                </header>

                {/* Add Form */}
                <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm">
                    <form onSubmit={handleAdd} className="flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium text-zinc-400">添加新主播</label>
                            <Input
                                name="authCode"
                                value={newAuthCode}
                                onChange={(e) => setNewAuthCode(e.target.value)}
                                placeholder="输入身份码添加监控..."
                                className="bg-zinc-800 border-zinc-700 focus:ring-blue-500/20"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={isPending || !newAuthCode}
                            className="bg-blue-600 hover:bg-blue-500 text-white"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            初始化监控
                        </Button>
                    </form>
                </section>

                {/* List Table */}
                <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl backdrop-blur-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-zinc-900">
                            <TableRow className="border-zinc-800 hover:bg-transparent">
                                <TableHead className="w-[100px]">状态</TableHead>
                                <TableHead>主播信息</TableHead>
                                <TableHead>身份码 / 房间号</TableHead>
                                <TableHead>今日流水</TableHead>
                                <TableHead>最后更新</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {broadcasters.map((b) => (
                                <TableRow key={b.id} className="border-zinc-800 hover:bg-zinc-800/30">
                                    <TableCell>
                                        <div className="flex items-center gap-2 pl-2">
                                            <div
                                                className={cn(
                                                    "w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] transition-colors duration-500",
                                                    b.active
                                                        ? "bg-emerald-500 shadow-emerald-500/50"
                                                        : "bg-red-500/50 shadow-none"
                                                )}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border border-zinc-700">
                                                <AvatarImage src={b.uface ?? undefined} alt={b.uname ?? undefined} referrerPolicy="no-referrer" />
                                                <AvatarFallback className="bg-zinc-800 text-xs">Unknown</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium text-zinc-200">{b.uname || '获取中...'}</div>
                                                <div className="text-xs text-zinc-500">UID: {b.uid || '-'}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-zinc-400 text-xs">
                                        <div className="font-mono">{b.auth_code.slice(0, 8)}...</div>
                                        <div className="mt-1 text-zinc-500">Room: {b.room_id || '-'}</div>
                                    </TableCell>
                                    <TableCell>
                                        {b.stats ? (
                                            <div className="flex flex-col gap-1">
                                                <span className="text-yellow-400 font-bold">¥{b.stats.totalIncome}</span>
                                                <span className="text-xs text-zinc-500">
                                                    礼物 {b.stats.giftCount} / 舰长 {b.stats.guardCount}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-zinc-600">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-zinc-500 text-sm">
                                        {new Date(b.updated_at).toLocaleString('zh-CN')}
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => { setSelectedBroadcasterId(b.id); setPwdDialogOpen(true); }}
                                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/20"
                                        >
                                            <Key className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleToggle(b.id, b.active)}
                                            disabled={isPending}
                                            className={cn(
                                                "hover:bg-zinc-800",
                                                b.active ? "text-amber-400 hover:text-amber-300" : "text-emerald-400 hover:text-emerald-300"
                                            )}
                                        >
                                            {b.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDelete(b.id)}
                                            disabled={isPending}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-950/20"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {broadcasters.length === 0 && (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={6} className="text-center py-12 text-zinc-500">
                                        暂无监控任务
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </section>

                <PasswordDialog
                    open={pwdDialogOpen}
                    onOpenChange={setPwdDialogOpen}
                    title="修改主播密码"
                    description="请为该主播设置一个新的登录密码。修改后主播下次登录需使用新密码。"
                    action={(pwd) => selectedBroadcasterId ? updateBroadcasterPasswordAction(selectedBroadcasterId, pwd) : Promise.resolve({ success: false })}
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
