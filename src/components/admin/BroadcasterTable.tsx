'use client';

import { Table } from '@heroui/react';
import { Button } from '@/components/ui/button';
import {
    Copy,
    Eye,
    Gauge,
    KeyRound,
    PauseCircle,
    Pencil,
    PlayCircle,
    Trash2,
} from 'lucide-react';
import { tableChrome } from '@/components/shared/table';
import { normalizeAvatarSrc } from '@/lib/format';
import { Broadcaster, DashboardStats } from '@/lib/types';

export type BroadcasterWithStats = Broadcaster & { stats?: DashboardStats; isLive?: boolean };

const emptyStats: DashboardStats = {
    danmakuCount: 0,
    giftCount: 0,
    guardCount: 0,
    scCount: 0,
    totalIncome: 0,
};

interface BroadcasterTableProps {
    broadcasters: BroadcasterWithStats[];
    revealedAuthCodes: Record<number, string>;
    isPending: boolean;
    openingDashboardId: number | null;
    onCopyAuthCode: (authCode: string) => void;
    onRequestReveal: (id: number) => void;
    onOpenDashboard: (id: number) => void;
    onOpenBroadcasterPage: (broadcaster: BroadcasterWithStats) => void;
    onEditAuthCode: (broadcaster: BroadcasterWithStats) => void;
    onEditPassword: (id: number) => void;
    onToggle: (id: number, currentStatus: number) => void;
    onDelete: (id: number) => void;
}

export function BroadcasterTable({
    broadcasters,
    revealedAuthCodes,
    isPending,
    openingDashboardId,
    onCopyAuthCode,
    onRequestReveal,
    onOpenDashboard,
    onOpenBroadcasterPage,
    onEditAuthCode,
    onEditPassword,
    onToggle,
    onDelete,
}: BroadcasterTableProps) {
    return (
        <Table variant="secondary">
            <Table.ScrollContainer className="dark-scrollbar overflow-x-auto">
                <Table.Content aria-label="主播监控列表" className={`${tableChrome} min-w-[1240px]`}>
                    <Table.Header>
                        <Table.Column id="status" className="w-[100px]">状态</Table.Column>
                        <Table.Column id="profile" isRowHeader className="w-[280px]">主播信息</Table.Column>
                        <Table.Column id="room" className="w-[180px]">身份码 / 房间号</Table.Column>
                        <Table.Column id="stats" className="w-[150px]">今日流水</Table.Column>
                        <Table.Column id="updated" className="w-[190px]">最后更新</Table.Column>
                        <Table.Column id="lastLogin" className="w-[190px]">最后登录</Table.Column>
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
                                            <span className="inline-flex items-center gap-2 text-sm font-semibold">
                                                <span className={broadcaster.active ? 'h-2 w-2 rounded-full bg-emerald-400' : 'h-2 w-2 rounded-full bg-red-400'} />
                                                <span className={broadcaster.active ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}>
                                                    {broadcaster.active ? '监控中' : '已暂停'}
                                                </span>
                                            </span>
                                            {broadcaster.isLive && (
                                                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
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
                                                    ? "rounded-full transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                                                    : "cursor-default rounded-full"
                                                }
                                                title={canOpenBroadcasterPage ? '打开主播页面' : '暂无主播跳转信息'}
                                                aria-label={canOpenBroadcasterPage ? `打开 ${broadcaster.uname || '主播'} 页面` : '暂无主播跳转信息'}
                                                onClick={() => onOpenBroadcasterPage(broadcaster)}
                                            >
                                                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-sm font-semibold text-muted-foreground">
                                                    {avatarSrc ? (
                                                        // Bilibili avatar CDN may reject requests with a page Referer.
                                                        // eslint-disable-next-line @next/next/no-img-element
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
                                                    <span className="truncate font-medium text-foreground">{broadcaster.uname || '获取中...'}</span>
                                                    {broadcaster.isLive && (
                                                        <span className="shrink-0 rounded bg-sky-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-sky-300">
                                                            直播中
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-muted-foreground">UID: {broadcaster.uid || '-'}</div>
                                            </div>
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="secondary"
                                                aria-label={revealedAuthCode ? '复制身份码' : '验证后查看完整身份码'}
                                                className="inline-flex h-8 max-w-[170px] items-center justify-center gap-2 rounded-lg border border-border bg-accent/40 px-2 font-mono text-xs text-secondary-foreground hover:bg-accent"
                                                onClick={() => {
                                                    if (revealedAuthCode) {
                                                        onCopyAuthCode(revealedAuthCode);
                                                        return;
                                                    }
                                                    onRequestReveal(broadcaster.id);
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
                                            <div className="mt-1 text-sm text-muted-foreground">房间 {broadcaster.room_id || '-'}</div>
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div className="font-semibold tabular-nums text-yellow-400">¥{stats.totalIncome}</div>
                                        <div className="text-xs text-muted-foreground">
                                            礼物 {stats.giftCount} / 舰长 {stats.guardCount}
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell className="text-muted-foreground">
                                        {new Date(broadcaster.updated_at).toLocaleString('zh-CN')}
                                    </Table.Cell>
                                    <Table.Cell className="text-muted-foreground">
                                        {broadcaster.last_login_at
                                            ? new Date(broadcaster.last_login_at).toLocaleString('zh-CN', { hour12: false })
                                            : <span className="text-muted-foreground/70">从未登录</span>}
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div className="flex min-w-[308px] items-center justify-end gap-2 whitespace-nowrap">
                                            {broadcaster.uid && broadcaster.room_id && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="inline-flex h-9 min-w-[72px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-3 text-white hover:bg-primary/90"
                                                    disabled={openingDashboardId === broadcaster.id}
                                                    onClick={() => onOpenDashboard(broadcaster.id)}
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
                                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border p-0 text-secondary-foreground hover:bg-accent"
                                                onClick={() => onEditAuthCode(broadcaster)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                aria-label="修改主播密码"
                                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border p-0 text-secondary-foreground hover:bg-accent"
                                                onClick={() => onEditPassword(broadcaster.id)}
                                            >
                                                <KeyRound className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="inline-flex h-9 min-w-[78px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border px-3 text-secondary-foreground hover:bg-accent"
                                                disabled={isPending}
                                                onClick={() => onToggle(broadcaster.id, broadcaster.active)}
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
                                                onClick={() => onDelete(broadcaster.id)}
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
                                <Table.Cell colSpan={7} className="py-10 text-center text-muted-foreground">
                                    暂无监控任务，在上方用身份码添加主播。
                                </Table.Cell>
                            </Table.Row>
                        )}
                    </Table.Body>
                </Table.Content>
            </Table.ScrollContainer>
        </Table>
    );
}
