
'use client';

import { useEffect, useState } from "react";
import { getDashboardData } from "./actions";
import { StatsPanel } from "@/components/dashboard/StatsPanel";
import { DanmakuPanel } from "@/components/dashboard/DanmakuPanel";
import { GiftPanel } from "@/components/dashboard/GiftPanel";
import { GuardPanel } from "@/components/dashboard/GuardPanel";
import { SCPanel } from "@/components/dashboard/SCPanel";
import { StatsCharts } from "@/components/dashboard/StatsCharts";
import { Broadcaster, DashboardStats, Danmaku, Gift, Guard, SuperChat } from "@/lib/types";
import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { startOfDay, endOfDay } from "date-fns";

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{
        broadcaster: Broadcaster | null;
        stats: DashboardStats | null;
        danmaku: Danmaku[];
        gifts: Gift[];
        guards: Guard[];
        superChats: SuperChat[];
        topDanmaku: { uname: string; count: number; uface: string }[];
        topGifts: { uname: string; total: number; uface: string }[];
    }>({
        broadcaster: null,
        stats: null,
        danmaku: [],
        gifts: [],
        guards: [],
        superChats: [],
        topDanmaku: [],
        topGifts: [],
    });
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    // Date Range State
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(),
        to: new Date()
    });

    const fetchData = async () => {
        try {
            if (!dateRange?.from) return;

            const start = startOfDay(dateRange.from).getTime();
            // If 'to' is undefined, just use end of 'from' day (single day selection)
            const end = endOfDay(dateRange.to || dateRange.from).getTime();

            const result = await getDashboardData(start, end);
            setData(result);
            setLastUpdated(new Date());
        } catch (error) {
            console.error("Fetch Error:", error);
            // Don't toast on auto-refresh failure to avoid spam
            if (loading) toast.error("获取数据失败");
        } finally {
            setLoading(false);
        }
    };

    // 初始加载 & 监听日期变化
    useEffect(() => {
        setLoading(true); // Show loader when changing dates
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange]);

    // 自动轮询 (每2秒)
    useEffect(() => {
        const interval = setInterval(() => {
            // Only poll if "today" is included in range or we want live updates
            // For simplicity, just poll.
            fetchData();
        }, 2000);
        return () => clearInterval(interval);
    }, [dateRange]);

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
                        <AvatarImage src={data.broadcaster?.uface ?? undefined} />
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
