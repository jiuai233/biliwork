
'use client';

import { useEffect, useState, useMemo, useCallback } from "react";
import { getDashboardData } from "./actions";
import { StatsPanel } from "@/components/dashboard/StatsPanel";
import { DanmakuPanel } from "@/components/dashboard/DanmakuPanel";
import { GiftPanel } from "@/components/dashboard/GiftPanel";
import { GuardPanel } from "@/components/dashboard/GuardPanel";
import { SCPanel } from "@/components/dashboard/SCPanel";
import { StatsCharts } from "@/components/dashboard/StatsCharts";
import { Broadcaster, DashboardStats, Danmaku, Gift, Guard, SuperChat } from "@/lib/types";
import { Loader2, RefreshCcw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { startOfDay, endOfDay } from "date-fns";
import { useSSE } from "@/hooks/useSSE";

type DashboardData = {
    broadcaster: Broadcaster | null;
    stats: DashboardStats | null;
    danmaku: Danmaku[];
    gifts: Gift[];
    guards: Guard[];
    superChats: SuperChat[];
    topDanmaku: { uname: string; count: number; uface: string }[];
    topGifts: { uname: string; total: number; uface: string }[];
};

const defaultData: DashboardData = {
    broadcaster: null,
    stats: null,
    danmaku: [],
    gifts: [],
    guards: [],
    superChats: [],
    topDanmaku: [],
    topGifts: [],
};

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DashboardData>(defaultData);

    // Date Range State
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(),
        to: new Date()
    });

    // SSE URL 根据日期范围动态生成
    const sseUrl = useMemo(() => {
        if (!dateRange?.from) return '';
        const start = startOfDay(dateRange.from).getTime();
        const end = endOfDay(dateRange.to || dateRange.from).getTime();
        return `/api/dashboard/stream?startTime=${start}&endTime=${end}`;
    }, [dateRange]);

    // SSE 连接
    const { data: sseData, isConnected, reconnect } = useSSE<DashboardData>(sseUrl);

    // SSE 数据更新时同步到 state
    useEffect(() => {
        if (sseData) {
            setData(sseData);
            setLoading(false);
        }
    }, [sseData]);

    // 手动刷新（fallback，使用 Server Action）
    const fetchData = useCallback(async (showError = false) => {
        try {
            if (!dateRange?.from) return;
            const start = startOfDay(dateRange.from).getTime();
            const end = endOfDay(dateRange.to || dateRange.from).getTime();
            const result = await getDashboardData(start, end);
            setData(result);
        } catch (error) {
            console.error("Fetch Error:", error);
            if (showError) toast.error("获取数据失败");
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        setLoading(true);
        fetchData(true);
    }, [fetchData]);

    if (loading && !data.broadcaster) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/40 p-6 rounded-xl border border-zinc-800 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-purple-500 shadow-lg shadow-purple-900/20">
                        <AvatarImage src={data.broadcaster?.uface ?? undefined} referrerPolicy="no-referrer" />
                        <AvatarFallback>{data.broadcaster?.uname?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-100">{data.broadcaster?.uname}</h2>
                        <div className="flex items-center gap-2 text-zinc-400 text-sm mt-1">
                            <span>Room ID: {data.broadcaster?.room_id}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-600" />
                            <span className={data.broadcaster?.active ? "text-green-400" : "text-zinc-500"}>
                                {data.broadcaster?.active ? "● 监控中" : "○ 已暂停"}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                    <div className="w-px h-8 bg-zinc-800 mx-1" />
                    {/* SSE 连接状态 */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800/50 border border-zinc-700/50">
                        {isConnected ? (
                            <>
                                <Wifi className="h-3.5 w-3.5 text-green-400" />
                                <span className="text-xs text-green-400">实时</span>
                            </>
                        ) : (
                            <button onClick={reconnect} className="flex items-center gap-2 hover:opacity-80">
                                <WifiOff className="h-3.5 w-3.5 text-red-400" />
                                <span className="text-xs text-red-400">已断开</span>
                            </button>
                        )}
                    </div>
                    <Button variant="outline" size="icon" onClick={() => fetchData()} disabled={loading} className="border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800">
                        <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            {data.stats && <StatsPanel stats={data.stats} />}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Gifts & Guards */}
                <div className="space-y-6 lg:col-span-1">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
                            <span className="w-1 h-5 bg-pink-500 rounded-full" />
                            最新礼物
                        </h3>
                        <GiftPanel data={data.gifts} />
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
                            <span className="w-1 h-5 bg-indigo-500 rounded-full" />
                            最近上舰
                        </h3>
                        <GuardPanel data={data.guards} />
                    </div>
                </div>

                {/* Middle Column: Danmaku */}
                <div className="space-y-4 lg:col-span-1">
                    <h3 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
                        <span className="w-1 h-5 bg-blue-500 rounded-full" />
                        实时弹幕
                    </h3>
                    <DanmakuPanel data={data.danmaku} />

                    {/* Stats Charts */}
                    <StatsCharts danmakuTop={data.topDanmaku} giftTop={data.topGifts} />
                </div>

                {/* Right Column: Super Chats */}
                <div className="space-y-4 lg:col-span-1">
                    <h3 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
                        <span className="w-1 h-5 bg-red-500 rounded-full" />
                        醒目留言 (SC)
                    </h3>
                    <SCPanel data={data.superChats} />
                </div>
            </div>
        </div>
    );
}
