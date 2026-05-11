'use client';

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getSessionDetail } from "../actions";
import { Loader2, ArrowLeft, MessageSquare, Gift, Shield, Sparkles, Users, Clock } from "lucide-react";
import { Table } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type SessionDetailData = Awaited<ReturnType<typeof getSessionDetail>>;

export default function SessionDetailPage() {
    return (
        <Suspense fallback={<DetailLoading />}>
            <SessionDetailContent />
        </Suspense>
    );
}

function DetailLoading() {
    return (
        <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
    );
}

function SessionDetailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [data, setData] = useState<SessionDetailData | null>(null);

    const startTs = Number(searchParams.get('start') || 0);
    const endTs = Number(searchParams.get('end') || 0);
    const title = searchParams.get('title') || '直播场次';

    useEffect(() => {
        if (!startTs) return;
        getSessionDetail(startTs, endTs || Date.now())
            .then(setData)
            .catch(() => toast.error('获取详情失败'));
    }, [startTs, endTs]);

    if (!data) {
        return <DetailLoading />;
    }

    const formatTime = (ts: number | null) => {
        if (!ts) return '-';
        return format(new Date(ts), 'MM-dd HH:mm:ss');
    };

    const duration = endTs ? Math.round((endTs - startTs) / 60000) : 0;
    const formatDuration = (m: number) => {
        if (m <= 0) return '进行中';
        const h = Math.floor(m / 60);
        const min = m % 60;
        return h > 0 ? `${h}h ${min}m` : `${min}m`;
    };

    const guardLevelName = (level: number | null) => {
        if (level === 1) return '总督';
        if (level === 2) return '提督';
        if (level === 3) return '舰长';
        return '舰长';
    };

    const guardLevelColor = (level: number | null) => {
        if (level === 1) return 'text-red-400';
        if (level === 2) return 'text-purple-400';
        return 'text-blue-400';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm md:flex-row md:items-center">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.back()}
                        className="h-9 w-9 border-zinc-700 bg-zinc-800/50 p-0 hover:bg-zinc-800"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-100">{title}</h2>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
                            <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {formatTime(startTs)} ~ {endTs ? formatTime(endTs) : '进行中'}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-zinc-600" />
                            <span>{formatDuration(duration)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <StatCard icon={MessageSquare} label="弹幕" value={data.danmakuCount.toString()} color="blue" />
                <StatCard icon={Gift} label="礼物收入" value={`${data.stats.totalIncome.toFixed(1)} ¥`} color="amber" />
                <StatCard icon={Gift} label="礼物" value={data.stats.giftCount.toString()} color="pink" />
                <StatCard icon={Shield} label="上舰" value={data.stats.guardCount.toString()} color="indigo" />
                <StatCard icon={Sparkles} label="SC" value={data.stats.scCount.toString()} color="yellow" />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
                <Panel title="礼物明细（按用户）" accent="bg-pink-500" className="xl:min-h-[620px]">
                    <div className="h-[540px] overflow-auto">
                        <Table variant="secondary" className="min-w-[760px]">
                            <Table.Content
                                aria-label="礼物明细"
                                className="w-full table-fixed border-collapse [&_tbody_tr]:border-b [&_tbody_tr]:border-zinc-800/60 [&_tbody_tr:hover]:bg-zinc-800/30 [&_td]:px-4 [&_td]:py-3 [&_th]:sticky [&_th]:top-0 [&_th]:bg-zinc-900 [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-zinc-400"
                            >
                                <Table.Header>
                                    <Table.Column id="rank" isRowHeader className="w-[60px]">#</Table.Column>
                                    <Table.Column id="user" className="w-[220px]">用户</Table.Column>
                                    <Table.Column id="gifts">礼物详情</Table.Column>
                                    <Table.Column id="value" className="w-[120px] text-right">总价值</Table.Column>
                                </Table.Header>
                                <Table.Body>
                                    {data.giftUsers.map((user, i) => (
                                        <Table.Row key={user.uname} id={user.uname}>
                                            <Table.Cell className="font-mono text-zinc-500">{i + 1}</Table.Cell>
                                            <Table.Cell>
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <SafeAvatar src={user.uface} name={user.uname} className="h-7 w-7" />
                                                    <span className="truncate text-sm font-medium text-zinc-200">{user.uname}</span>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <div className="flex flex-wrap gap-2">
                                                    {user.gifts.map((gift) => (
                                                        <GiftPill key={gift.name} gift={gift} />
                                                    ))}
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell className="text-right font-bold text-amber-400">
                                                {user.totalValue.toFixed(1)} ¥
                                            </Table.Cell>
                                        </Table.Row>
                                    ))}
                                    {data.giftUsers.length === 0 && (
                                        <Table.Row id="empty">
                                            <Table.Cell colSpan={4} className="py-20 text-center text-zinc-500">
                                                本场无礼物记录
                                            </Table.Cell>
                                        </Table.Row>
                                    )}
                                </Table.Body>
                            </Table.Content>
                        </Table>
                    </div>
                </Panel>

                <div className="grid gap-5 xl:min-h-[620px] xl:grid-rows-[190px_220px_minmax(0,1fr)]">
                    <Panel title={`醒目留言 (${data.superChats.length})`} accent="bg-yellow-500" className="min-h-[190px] overflow-hidden">
                        <div className="h-full overflow-y-auto pr-1">
                            <div className="space-y-3">
                                {data.superChats.map((sc, i) => (
                                    <div key={`${sc.uname}-${sc.ts}-${i}`} className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                                        <div className="mb-1.5 flex items-center justify-between gap-3">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <SafeAvatar src={sc.uface} name={sc.uname} className="h-6 w-6" />
                                                <span className="truncate text-sm text-zinc-300">{sc.uname}</span>
                                            </div>
                                            <span className="shrink-0 text-sm font-bold text-yellow-400">¥{sc.rmb}</span>
                                        </div>
                                        <p className="line-clamp-2 text-xs text-zinc-400">{sc.message || '(无内容)'}</p>
                                    </div>
                                ))}
                                {data.superChats.length === 0 && <EmptyState>本场无 SC</EmptyState>}
                            </div>
                        </div>
                    </Panel>

                    <Panel title={`上舰记录 (${data.guards.length})`} accent="bg-indigo-500" className="min-h-[220px] overflow-hidden">
                        <div className="h-full overflow-y-auto pr-1">
                            <div className="space-y-2">
                                {data.guards.map((guard, i) => (
                                    <div key={`${guard.uname}-${guard.ts}-${i}`} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <SafeAvatar src={guard.uface} name={guard.uname} className="h-7 w-7" />
                                            <span className="truncate text-sm text-zinc-300">{guard.uname}</span>
                                            <span className={cn("shrink-0 text-xs font-medium", guardLevelColor(guard.guardLevel))}>
                                                {guardLevelName(guard.guardLevel)}
                                            </span>
                                        </div>
                                        <span className="shrink-0 text-sm font-bold text-blue-400">¥{guard.price.toFixed(0)}</span>
                                    </div>
                                ))}
                                {data.guards.length === 0 && <EmptyState>本场无上舰</EmptyState>}
                            </div>
                        </div>
                    </Panel>

                    <Panel title="弹幕排行" accent="bg-blue-500" icon={<Users className="h-4 w-4" />} className="min-h-[240px] overflow-hidden">
                        <div className="h-full overflow-y-auto pr-1">
                            <div className="space-y-2">
                                {data.topDanmaku.slice(0, 10).map((user, i) => (
                                    <div key={`${user.uname}-${i}`} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-2.5">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className="w-5 shrink-0 font-mono text-xs text-zinc-500">{i + 1}</span>
                                            <SafeAvatar src={user.uface} name={user.uname} className="h-6 w-6" />
                                            <span className="truncate text-sm text-zinc-300">{user.uname}</span>
                                        </div>
                                        <span className="shrink-0 text-sm font-medium text-blue-400">{user.count} 条</span>
                                    </div>
                                ))}
                                {data.topDanmaku.length === 0 && <EmptyState>本场无弹幕</EmptyState>}
                            </div>
                        </div>
                    </Panel>
                </div>
            </div>
        </div>
    );
}

function Panel({ title, accent, icon, className, children }: {
    title: string;
    accent: string;
    icon?: React.ReactNode;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <section className={cn("flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/45 shadow-sm shadow-black/20", className)}>
            <div className="flex shrink-0 items-center gap-2 px-4 py-3">
                <span className={cn("h-5 w-1 rounded-full", accent)} />
                {icon}
                <h3 className="text-lg font-semibold text-zinc-200">{title}</h3>
            </div>
            <div className="min-h-0 flex-1 px-4 pb-4">
                {children}
            </div>
        </section>
    );
}

function GiftPill({ gift }: {
    gift: { name: string; count: number; value: number; icon: string };
}) {
    return (
        <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-zinc-700/70 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
            <SafeGiftIcon src={gift.icon} name={gift.name} />
            <span className="max-w-[160px] truncate">{gift.name}</span>
            <span className="text-zinc-400">x{gift.count}</span>
            <span className="font-medium text-amber-400">{gift.value.toFixed(1)}¥</span>
        </span>
    );
}

function SafeAvatar({ src, name, className }: {
    src?: string;
    name: string;
    className?: string;
}) {
    const [failed, setFailed] = useState(false);
    const initial = name?.trim()?.[0] || '?';
    const showImage = Boolean(src) && !failed;

    return (
        <span className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-800 text-[10px] font-medium text-zinc-300", className)}>
            {showImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={src}
                    alt={name}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => setFailed(true)}
                />
            ) : (
                <span>{initial}</span>
            )}
        </span>
    );
}

function SafeGiftIcon({ src, name }: {
    src?: string;
    name: string;
}) {
    const [failed, setFailed] = useState(false);

    if (!src || failed) {
        return (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-zinc-700/70">
                <Gift className="h-3 w-3 text-zinc-400" />
            </span>
        );
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt={name}
            className="h-4 w-4 shrink-0 object-contain"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
        />
    );
}

function EmptyState({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-24 items-center justify-center text-sm text-zinc-500">
            {children}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color }: {
    icon: React.ElementType;
    label: string;
    value: string;
    color: string;
}) {
    const colorMap: Record<string, string> = {
        blue: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30',
        amber: 'from-amber-500/20 to-orange-500/10 border-amber-500/30',
        pink: 'from-pink-500/20 to-rose-500/10 border-pink-500/30',
        indigo: 'from-indigo-500/20 to-violet-500/10 border-indigo-500/30',
        yellow: 'from-yellow-500/20 to-amber-500/10 border-yellow-500/30',
    };
    const iconColorMap: Record<string, string> = {
        blue: 'text-blue-400',
        amber: 'text-amber-400',
        pink: 'text-pink-400',
        indigo: 'text-indigo-400',
        yellow: 'text-yellow-400',
    };

    return (
        <div className={`rounded-xl border bg-gradient-to-br p-4 ${colorMap[color]} backdrop-blur-sm`}>
            <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-zinc-400">{label}</span>
                <Icon className={`h-4 w-4 ${iconColorMap[color]}`} />
            </div>
            <div className="text-xl font-bold text-zinc-100">{value}</div>
        </div>
    );
}
