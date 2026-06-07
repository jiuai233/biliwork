'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { endOfDay, startOfDay } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Gift as GiftIcon,
    Loader2,
    MessageSquareText,
    RefreshCcw,
    Shield,
    Wifi,
    WifiOff,
} from "lucide-react";
import { getDashboardData } from "./actions";
import { AnalyticsDateRangePicker } from "@/components/dashboard/AnalyticsDateRangePicker";
import { DanmakuPanel } from "@/components/dashboard/DanmakuPanel";
import { GiftPanel } from "@/components/dashboard/GiftPanel";
import { GuardPanel } from "@/components/dashboard/GuardPanel";
import { StatsPanel } from "@/components/dashboard/StatsPanel";
import { StatsCharts } from "@/components/dashboard/StatsCharts";
import { useSSE } from "@/hooks/useSSE";
import { Broadcaster, DashboardStats, Danmaku, Gift, Guard, SuperChat } from "@/lib/types";
import { cn } from "@/lib/utils";

type DashboardData = {
    broadcaster: Broadcaster | null;
    stats: DashboardStats | null;
    previousStats?: DashboardStats | null;
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
    previousStats: null,
    danmaku: [],
    gifts: [],
    guards: [],
    superChats: [],
    topDanmaku: [],
    topGifts: [],
};

type FeedTab = "gifts" | "danmaku" | "guards";

const feedTabs: {
    key: FeedTab;
    label: string;
    icon: typeof GiftIcon;
    activeClass: string;
}[] = [
        {
            key: "gifts",
            label: "礼物",
            icon: GiftIcon,
            activeClass: "bg-pink-600 text-white shadow-pink-950/40",
        },
        {
            key: "danmaku",
            label: "弹幕",
            icon: MessageSquareText,
            activeClass: "bg-blue-600 text-white shadow-blue-950/40",
        },
        {
            key: "guards",
            label: "上舰",
            icon: Shield,
            activeClass: "bg-indigo-600 text-white shadow-indigo-950/40",
        },
    ];

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DashboardData>(defaultData);
    const [activeFeed, setActiveFeed] = useState<FeedTab>("gifts");

    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(),
        to: new Date(),
    });

    const sseUrl = useMemo(() => {
        if (!dateRange?.from) return "";
        const start = startOfDay(dateRange.from).getTime();
        const end = endOfDay(dateRange.to || dateRange.from).getTime();
        return `/api/dashboard/stream?startTime=${start}&endTime=${end}`;
    }, [dateRange]);

    const { data: sseData, isConnected, reconnect } = useSSE<DashboardData>(sseUrl);

    useEffect(() => {
        if (sseData) {
            setData(sseData);
            setLoading(false);
        }
    }, [sseData]);

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
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="min-w-0 space-y-4">
            <section className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                        <h1 className="truncate text-2xl font-black tracking-normal text-white md:text-3xl">
                            欢迎回来，{data.broadcaster?.uname ?? "主播"}
                        </h1>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-400">
                            <span>Room ID: {data.broadcaster?.room_id ?? "-"}</span>
                            <span className="h-1 w-1 rounded-full bg-slate-600" />
                            <span className={data.broadcaster?.active ? "text-emerald-300" : "text-slate-500"}>
                                {data.broadcaster?.active ? "监控中" : "已暂停"}
                            </span>
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <AnalyticsDateRangePicker date={dateRange} setDate={setDateRange} />
                        <div className="flex h-10 items-center gap-2 rounded-xl border border-emerald-400/10 bg-emerald-400/10 px-4">
                            {isConnected ? (
                                <>
                                    <Wifi className="h-4 w-4 text-emerald-300" />
                                    <span className="text-sm font-semibold text-emerald-300">实时</span>
                                </>
                            ) : (
                                <button type="button" onClick={reconnect} className="flex items-center gap-2">
                                    <WifiOff className="h-4 w-4 text-red-300" />
                                    <span className="text-sm font-semibold text-red-300">已断开</span>
                                </button>
                            )}
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => fetchData()}
                            disabled={loading}
                            aria-label="刷新"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] p-0 text-slate-200 hover:bg-white/[0.09]"
                        >
                            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </div>
            </section>

            {data.stats && <StatsPanel stats={data.stats} previousStats={data.previousStats} />}

            <section className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="min-w-0 space-y-3">
                    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-white/10 bg-slate-950/65 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0">
                            <h2 className="text-lg font-extrabold text-white">实时动态</h2>
                            <p className="mt-1 text-sm text-slate-500">礼物、弹幕与上舰记录统一汇总。</p>
                        </div>

                        <div className="grid w-full grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/20 p-1 sm:w-auto">
                            {feedTabs.map((tab) => {
                                const Icon = tab.icon;
                                const active = activeFeed === tab.key;

                                return (
                                    <Button
                                        key={tab.key}
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        aria-pressed={active}
                                        data-testid={`dashboard-feed-tab-${tab.key}`}
                                        onClick={() => setActiveFeed(tab.key)}
                                        className={cn(
                                            "inline-flex h-10 min-w-0 flex-row items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold shadow-lg transition-colors",
                                            active
                                                ? tab.activeClass
                                                : "text-slate-400 shadow-transparent hover:bg-white/[0.06] hover:text-white"
                                        )}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        <span>{tab.label}</span>
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {activeFeed === "gifts" && (
                        <GiftPanel
                            data={data.gifts}
                            className="h-[520px] rounded-xl shadow-none xl:h-[calc(100vh-345px)] xl:min-h-[520px]"
                        />
                    )}
                    {activeFeed === "danmaku" && (
                        <DanmakuPanel
                            data={data.danmaku}
                            className="h-[520px] rounded-xl shadow-none xl:h-[calc(100vh-345px)] xl:min-h-[520px]"
                        />
                    )}
                    {activeFeed === "guards" && (
                        <GuardPanel
                            data={data.guards}
                            className="h-[520px] rounded-xl shadow-none xl:h-[calc(100vh-345px)] xl:min-h-[520px]"
                        />
                    )}
                </div>

                <StatsCharts
                    danmakuTop={data.topDanmaku}
                    giftTop={data.topGifts}
                    className="h-[520px] rounded-xl shadow-none 2xl:h-[calc(100vh-262px)] 2xl:min-h-[520px]"
                />
            </section>
        </div>
    );
}
