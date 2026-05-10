'use client';

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getSessionDetail } from "../actions";
import { Loader2, ArrowLeft, MessageSquare, Gift, Shield, Sparkles, Users, Clock } from "lucide-react";
import { Avatar, Button, Table } from "@heroui/react";
import { toast } from "sonner";
import { format } from "date-fns";

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
        <div className="flex items-center justify-center h-[50vh]">
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
            .catch(() => toast.error('获取详情失败'))
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
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/40 p-6 rounded-xl border border-zinc-800 backdrop-blur-sm">
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
                        <div className="flex items-center gap-3 text-sm text-zinc-500 mt-1">
                            <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {formatTime(startTs)} ~ {endTs ? formatTime(endTs) : '进行中'}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-zinc-600" />
                            <span>{formatDuration(duration)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard icon={MessageSquare} label="弹幕" value={data.danmakuCount.toString()} color="blue" />
                <StatCard icon={Gift} label="礼物收入" value={`${data.stats.totalIncome.toFixed(1)} ¥`} color="amber" />
                <StatCard icon={Gift} label="礼物" value={data.stats.giftCount.toString()} color="pink" />
                <StatCard icon={Shield} label="上舰" value={data.stats.guardCount.toString()} color="indigo" />
                <StatCard icon={Sparkles} label="SC" value={data.stats.scCount.toString()} color="yellow" />
            </div>

            {/* Main Content: 3 columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: 礼物用户排行 */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
                        <span className="w-1 h-5 bg-pink-500 rounded-full" />
                        礼物明细（按用户）
                    </h3>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                        <div className="h-[500px] overflow-auto">
                            <Table variant="secondary" className="min-w-[760px]">
                                <Table.Content
                                    aria-label="礼物明细"
                                    className="w-full table-fixed border-collapse [&_tbody_tr]:border-b [&_tbody_tr]:border-zinc-800/60 [&_tbody_tr:hover]:bg-zinc-800/30 [&_td]:px-4 [&_td]:py-3 [&_th]:sticky [&_th]:top-0 [&_th]:bg-zinc-900 [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-zinc-400"
                                >
                                    <Table.Header>
                                        <Table.Column id="rank" isRowHeader className="w-[60px]">#</Table.Column>
                                        <Table.Column id="user">用户</Table.Column>
                                        <Table.Column id="gifts">礼物详情</Table.Column>
                                        <Table.Column id="value" className="text-right">总价值</Table.Column>
                                    </Table.Header>
                                    <Table.Body>
                                    {data.giftUsers.map((user, i) => (
                                        <Table.Row key={user.uname} id={user.uname}>
                                            <Table.Cell className="font-mono text-zinc-500">{i + 1}</Table.Cell>
                                            <Table.Cell>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-7 w-7 border border-zinc-700">
                                                        <Avatar.Image src={user.uface} />
                                                        <Avatar.Fallback className="bg-zinc-800 text-[10px]">{user.uname[0]}</Avatar.Fallback>
                                                    </Avatar>
                                                    <span className="text-zinc-200 text-sm max-w-[120px] truncate">{user.uname}</span>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {user.gifts.map((g) => (
                                                        <span key={g.name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-xs text-zinc-300 border border-zinc-700/50">
                                                            {g.name} ×{g.count}
                                                            <span className="text-amber-400 ml-0.5">{g.value.toFixed(1)}¥</span>
                                                        </span>
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
                                            <Table.Cell colSpan={4} className="text-center text-zinc-500 py-10">
                                                本场无礼物记录
                                            </Table.Cell>
                                        </Table.Row>
                                    )}
                                    </Table.Body>
                                </Table.Content>
                            </Table>
                        </div>
                    </div>
                </div>

                {/* Right: SC + 舰长 */}
                <div className="space-y-6">
                    {/* SuperChat */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
                            <span className="w-1 h-5 bg-yellow-500 rounded-full" />
                            醒目留言 ({data.superChats.length})
                        </h3>
                        <div className="h-[220px] overflow-y-auto">
                            <div className="space-y-3">
                                {data.superChats.map((sc, i) => (
                                    <div key={i} className="p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-5 w-5">
                                                    <Avatar.Image src={sc.uface} />
                                                    <Avatar.Fallback className="text-[8px]">{sc.uname[0]}</Avatar.Fallback>
                                                </Avatar>
                                                <span className="text-sm text-zinc-300">{sc.uname}</span>
                                            </div>
                                            <span className="text-yellow-400 font-bold text-sm">¥{sc.rmb}</span>
                                        </div>
                                        <p className="text-xs text-zinc-400 line-clamp-2">{sc.message || '(无内容)'}</p>
                                    </div>
                                ))}
                                {data.superChats.length === 0 && (
                                    <div className="text-center text-zinc-500 py-6 text-sm">本场无 SC</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Guards */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
                            <span className="w-1 h-5 bg-indigo-500 rounded-full" />
                            上舰记录 ({data.guards.length})
                        </h3>
                        <div className="h-[220px] overflow-y-auto">
                            <div className="space-y-2">
                                {data.guards.map((g, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/50">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <Avatar.Image src={g.uface} />
                                                <Avatar.Fallback className="text-[8px]">{g.uname[0]}</Avatar.Fallback>
                                            </Avatar>
                                            <span className="text-sm text-zinc-300">{g.uname}</span>
                                            <span className={`text-xs font-medium ${guardLevelColor(g.guardLevel)}`}>
                                                {guardLevelName(g.guardLevel)}
                                            </span>
                                        </div>
                                        <span className="text-blue-400 font-bold text-sm">¥{g.price.toFixed(0)}</span>
                                    </div>
                                ))}
                                {data.guards.length === 0 && (
                                    <div className="text-center text-zinc-500 py-6 text-sm">本场无上舰</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Top Danmaku Users */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
                            <span className="w-1 h-5 bg-blue-500 rounded-full" />
                            <Users className="h-4 w-4" />
                            弹幕排行
                        </h3>
                        <div className="space-y-2">
                            {data.topDanmaku.slice(0, 5).map((u, i) => (
                                <div key={u.uname} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-zinc-500 w-5">{i + 1}</span>
                                        <Avatar className="h-5 w-5">
                                            <Avatar.Image src={u.uface} />
                                            <Avatar.Fallback className="text-[8px]">{u.uname[0]}</Avatar.Fallback>
                                        </Avatar>
                                        <span className="text-sm text-zinc-300 max-w-[100px] truncate">{u.uname}</span>
                                    </div>
                                    <span className="text-blue-400 text-sm font-medium">{u.count} 条</span>
                                </div>
                            ))}
                            {data.topDanmaku.length === 0 && (
                                <div className="text-center text-zinc-500 py-4 text-sm">本场无弹幕</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
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
        <div className={`p-4 rounded-xl border bg-gradient-to-br ${colorMap[color]} backdrop-blur-sm`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400 text-sm">{label}</span>
                <Icon className={`h-4 w-4 ${iconColorMap[color]}`} />
            </div>
            <div className="text-xl font-bold text-zinc-100">{value}</div>
        </div>
    );
}
