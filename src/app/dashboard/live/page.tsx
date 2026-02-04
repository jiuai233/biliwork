'use client';

import { useEffect, useState } from "react";
import { getLiveRecordsData } from "./actions";
import { Broadcaster } from "@/lib/types";
import { Loader2, RefreshCcw, Radio, Clock, Coins, Gift, Shield, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { startOfDay, endOfDay, format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

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
                    <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                    <div className="w-px h-8 bg-zinc-800 mx-1" />
                    <Button variant="outline" size="icon" onClick={() => fetchData()} disabled={loading} className="border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800">
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
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <ScrollArea className="h-[500px]">
                    <Table>
                        <TableHeader className="sticky top-0 bg-zinc-900">
                            <TableRow className="border-zinc-800 hover:bg-transparent">
                                <TableHead className="text-zinc-400">开播时间</TableHead>
                                <TableHead className="text-zinc-400">下播时间</TableHead>
                                <TableHead className="text-zinc-400">时长</TableHead>
                                <TableHead className="text-zinc-400">直播标题</TableHead>
                                <TableHead className="text-zinc-400">分区</TableHead>
                                <TableHead className="text-zinc-400 text-right">礼物</TableHead>
                                <TableHead className="text-zinc-400 text-right">舰长</TableHead>
                                <TableHead className="text-zinc-400 text-right">SC</TableHead>
                                <TableHead className="text-zinc-400 text-right">总收入</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.sessions.map((session) => (
                                <TableRow key={session.id} className="border-zinc-800/60 hover:bg-zinc-800/30">
                                    <TableCell className="text-green-400 font-medium">
                                        {formatDateTime(session.startTs)}
                                    </TableCell>
                                    <TableCell className="text-zinc-500">
                                        {session.endTs ? formatDateTime(session.endTs) : <span className="text-green-400">直播中</span>}
                                    </TableCell>
                                    <TableCell className="text-zinc-300">
                                        {formatDuration(session.duration)}
                                    </TableCell>
                                    <TableCell className="text-zinc-100 max-w-[200px] truncate">
                                        {session.title || '-'}
                                    </TableCell>
                                    <TableCell className="text-zinc-500">
                                        {session.areaName || '-'}
                                    </TableCell>
                                    <TableCell className="text-right text-pink-400">
                                        {session.giftIncome.toFixed(1)} ¥
                                    </TableCell>
                                    <TableCell className="text-right text-blue-400">
                                        {session.guardIncome.toFixed(1)} ¥
                                    </TableCell>
                                    <TableCell className="text-right text-yellow-400">
                                        {session.scIncome.toFixed(1)} ¥
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-amber-400">
                                        {session.totalIncome.toFixed(1)} ¥
                                    </TableCell>
                                </TableRow>
                            ))}
                            {data.sessions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center text-zinc-500 py-10">
                                        暂无开播记录
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
        </div>
    );
}
