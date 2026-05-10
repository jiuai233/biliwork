'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLiveRecordsData } from "./actions";
import { Broadcaster } from "@/lib/types";
import { Loader2, RefreshCcw, Radio, Clock, Coins, Gift, Shield, MessageSquare } from "lucide-react";
import { Button, Table } from "@heroui/react";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";
import { startOfDay, endOfDay, format } from "date-fns";
import { AnalyticsDateRangePicker } from "@/components/dashboard/AnalyticsDateRangePicker";

interface LiveSession {
    id: number;
    startTs: number;
    endTs: number | null;
    duration: number;
    title: string | null;
    areaName: string | null;
    giftIncome: number;
    guardIncome: number;
    scIncome: number;
    totalIncome: number;
}

export default function LiveRecordsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{
        broadcaster: Broadcaster | null;
        sessions: LiveSession[];
    }>({
        broadcaster: null,
        sessions: [],
    });

    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date()
    });

    const fetchData = async () => {
        try {
            if (!dateRange?.from) return;

            const start = startOfDay(dateRange.from).getTime();
            const end = endOfDay(dateRange.to || dateRange.from).getTime();

            const result = await getLiveRecordsData(start, end);
            setData(result);
        } catch (error) {
            console.error("Fetch Error:", error);
            if (loading) toast.error("获取数据失败");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [dateRange]);

    // 计算总计
    const totalSessions = data.sessions.length;
    const totalDuration = data.sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalIncome = data.sessions.reduce((sum, s) => sum + s.totalIncome, 0);
    const totalGift = data.sessions.reduce((sum, s) => sum + s.giftIncome, 0);  // 已经是元
    const totalGuard = data.sessions.reduce((sum, s) => sum + s.guardIncome, 0);
    const totalSC = data.sessions.reduce((sum, s) => sum + s.scIncome, 0);

    const formatDateTime = (ts: number | null) => {
        if (!ts) return '-';
        return format(new Date(ts), 'MM-dd HH:mm');
    };

    const formatDuration = (minutes: number) => {
        if (minutes <= 0) return '进行中';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    if (loading && !data.broadcaster) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/40 p-6 rounded-xl border border-zinc-800 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-900/20">
                        <Radio className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-100">开播记录</h2>
                        <p className="text-sm text-zinc-500 mt-1">每场直播的收入统计</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <AnalyticsDateRangePicker date={dateRange} setDate={setDateRange} />
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => fetchData()}
                        isDisabled={loading}
                        aria-label="刷新"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] p-0 text-slate-200 hover:bg-white/[0.09]"
                    >
                        <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="p-4 rounded-xl border bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-500/30 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-zinc-400 text-sm">开播次数</span>
                        <Radio className="h-4 w-4 text-green-400" />
                    </div>
                    <div className="text-xl font-bold text-zinc-100">{totalSessions}</div>
                </div>
                <div className="p-4 rounded-xl border bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border-blue-500/30 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-zinc-400 text-sm">总时长</span>
                        <Clock className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="text-xl font-bold text-zinc-100">{formatDuration(totalDuration)}</div>
                </div>
                <div className="p-4 rounded-xl border bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-500/30 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-zinc-400 text-sm">总收入</span>
                        <Coins className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="text-xl font-bold text-zinc-100">{totalIncome.toFixed(1)} ¥</div>
                </div>
                <div className="p-4 rounded-xl border bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-zinc-400 text-sm">礼物</span>
                        <Gift className="h-4 w-4 text-pink-400" />
                    </div>
                    <div className="text-xl font-bold text-zinc-100">{totalGift.toFixed(1)} ¥</div>
                </div>
                <div className="p-4 rounded-xl border bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-zinc-400 text-sm">舰长</span>
                        <Shield className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="text-xl font-bold text-zinc-100">{totalGuard.toFixed(1)} ¥</div>
                </div>
                <div className="p-4 rounded-xl border bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-zinc-400 text-sm">SC</span>
                        <MessageSquare className="h-4 w-4 text-yellow-400" />
                    </div>
                    <div className="text-xl font-bold text-zinc-100">{totalSC.toFixed(1)} ¥</div>
                </div>
            </div>

            {/* Sessions Table */}
            <div className="h-[500px] overflow-auto rounded-xl border border-zinc-800 bg-zinc-900/50">
                <Table variant="secondary" className="min-w-[1100px]">
                    <Table.Content
                        aria-label="开播记录"
                        className="w-full table-fixed border-collapse [&_tbody_tr]:border-b [&_tbody_tr]:border-zinc-800/60 [&_tbody_tr:hover]:bg-zinc-800/30 [&_td]:px-4 [&_td]:py-3 [&_th]:sticky [&_th]:top-0 [&_th]:bg-zinc-900 [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-zinc-400"
                    >
                        <Table.Header>
                            <Table.Column id="start" isRowHeader>开播时间</Table.Column>
                            <Table.Column id="end">下播时间</Table.Column>
                            <Table.Column id="duration">时长</Table.Column>
                            <Table.Column id="title">直播标题</Table.Column>
                            <Table.Column id="area">分区</Table.Column>
                            <Table.Column id="gift" className="text-right">礼物</Table.Column>
                            <Table.Column id="guard" className="text-right">舰长</Table.Column>
                            <Table.Column id="sc" className="text-right">SC</Table.Column>
                            <Table.Column id="total" className="text-right">总收入</Table.Column>
                            <Table.Column id="actions" className="w-[80px] text-center">操作</Table.Column>
                        </Table.Header>
                        <Table.Body>
                            {data.sessions.map((session) => (
                                <Table.Row key={session.id} id={session.id}>
                                    <Table.Cell className="text-green-400 font-medium">
                                        {formatDateTime(session.startTs)}
                                    </Table.Cell>
                                    <Table.Cell className="text-zinc-500">
                                        {session.endTs ? formatDateTime(session.endTs) : <span className="text-green-400">直播中</span>}
                                    </Table.Cell>
                                    <Table.Cell className="text-zinc-300">
                                        {formatDuration(session.duration)}
                                    </Table.Cell>
                                    <Table.Cell className="text-zinc-100 max-w-[200px] truncate">
                                        {session.title || '-'}
                                    </Table.Cell>
                                    <Table.Cell className="text-zinc-500">
                                        {session.areaName || '-'}
                                    </Table.Cell>
                                    <Table.Cell className="text-right text-pink-400">
                                        {session.giftIncome.toFixed(1)} ¥
                                    </Table.Cell>
                                    <Table.Cell className="text-right text-blue-400">
                                        {session.guardIncome.toFixed(1)} ¥
                                    </Table.Cell>
                                    <Table.Cell className="text-right text-yellow-400">
                                        {session.scIncome.toFixed(1)} ¥
                                    </Table.Cell>
                                    <Table.Cell className="text-right font-bold text-amber-400">
                                        {session.totalIncome.toFixed(1)} ¥
                                    </Table.Cell>
                                    <Table.Cell className="text-center">
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                const params = new URLSearchParams({
                                                    start: session.startTs.toString(),
                                                    end: (session.endTs || Date.now()).toString(),
                                                    title: session.title || `${formatDateTime(session.startTs)} 直播`,
                                                });
                                                router.push(`/dashboard/live/detail?${params}`);
                                            }}
                                            className="bg-blue-600/80 hover:bg-blue-500 text-white text-xs px-3"
                                        >
                                            详情
                                        </Button>
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                            {data.sessions.length === 0 && (
                                <Table.Row id="empty">
                                    <Table.Cell colSpan={10} className="text-center text-zinc-500 py-10">
                                        暂无开播记录
                                    </Table.Cell>
                                </Table.Row>
                            )}
                        </Table.Body>
                    </Table.Content>
                </Table>
            </div>
        </div>
    );
}
