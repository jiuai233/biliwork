'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { endOfDay, startOfDay } from "date-fns";
import { toast } from "sonner";
import {
    Gift as GiftIcon,
    MessageSquareText,
    Shield,
    Sparkles,
    Wifi,
    WifiOff,
} from "lucide-react";
import { getDashboardData } from "./actions";
import { AnalyticsDateRangePicker, type DateRange } from "@/components/dashboard/AnalyticsDateRangePicker";
import { DanmakuPanel } from "@/components/dashboard/DanmakuPanel";
import { GiftPanel } from "@/components/dashboard/GiftPanel";
import { GuardPanel } from "@/components/dashboard/GuardPanel";
import { BIG_GIFT_CNY, HighlightsList } from "@/components/dashboard/HighlightsList";
import { RankingList } from "@/components/dashboard/RankingList";
import { StatsPanel } from "@/components/dashboard/StatsPanel";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { Tabs, Tab, TabList, TabPanel } from "@/components/shared/tabs";
import { useSSE } from "@/hooks/useSSE";
import { formatCurrency } from "@/lib/format";
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

const feedTabs = [
    { key: "gifts", label: "礼物", icon: GiftIcon },
    { key: "danmaku", label: "弹幕", icon: MessageSquareText },
    { key: "guards", label: "上舰", icon: Shield },
];

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState<DashboardData>(defaultData);
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
        setRefreshing(true);
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
            setRefreshing(false);
        }
    }, [dateRange]);

    useEffect(() => {
        setLoading(true);
        fetchData(true);
    }, [fetchData]);

    if (loading && !data.broadcaster) {
        return <LoadingScreen />;
    }

    return (
        <div className="min-w-0 space-y-4 xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:gap-4 xl:space-y-0">
            <PageHeader
                title={`欢迎回来，${data.broadcaster?.uname ?? "主播"}`}
                description={
                    <>
                        <span>Room ID: {data.broadcaster?.room_id ?? "-"}</span>
                        <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                        <span className={data.broadcaster?.active ? "text-emerald-400" : "text-muted-foreground"}>
                            {data.broadcaster?.active ? "监控中" : "已暂停"}
                        </span>
                    </>
                }
                actions={
                    <>
                        <AnalyticsDateRangePicker date={dateRange} setDate={setDateRange} pending={refreshing} />
                        <div className={cn(
                            "flex h-10 items-center gap-2 rounded-xl border px-4",
                            isConnected ? "border-emerald-500/20 bg-emerald-500/10" : "border-red-500/20 bg-red-500/10",
                        )}>
                            {isConnected ? (
                                <>
                                    <Wifi className="h-4 w-4 text-emerald-400" />
                                    <span className="text-sm font-semibold text-emerald-400">实时</span>
                                </>
                            ) : (
                                <button type="button" onClick={reconnect} className="flex items-center gap-2">
                                    <WifiOff className="h-4 w-4 text-red-400" />
                                    <span className="text-sm font-semibold text-red-400">已断开，点击重连</span>
                                </button>
                            )}
                        </div>
                    </>
                }
            />

            {!isConnected && (
                <div className="flex shrink-0 items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
                    <WifiOff className="h-4 w-4 shrink-0" />
                    <span>实时连接已断开，当前数据可能不是最新</span>
                    <button
                        type="button"
                        onClick={reconnect}
                        className="ml-auto shrink-0 font-semibold underline-offset-2 hover:underline"
                    >
                        重连
                    </button>
                </div>
            )}

            {data.stats && <StatsPanel stats={data.stats} previousStats={data.previousStats} />}

            <section className="grid min-w-0 grid-cols-1 gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_390px]">
                <Tabs defaultSelectedKey="gifts" className="min-w-0 xl:flex xl:min-h-0 xl:flex-col">
                    <SectionCard
                        title="实时动态"
                        accent="bg-violet-500"
                        className="xl:flex xl:min-h-0 xl:flex-1 xl:flex-col"
                        bodyClassName="xl:flex xl:min-h-0 xl:flex-1 xl:flex-col"
                        actions={
                            <TabList aria-label="实时动态切换">
                                {feedTabs.map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <Tab key={tab.key} id={tab.key} data-testid={`dashboard-feed-tab-${tab.key}`}>
                                            <Icon className="h-3.5 w-3.5 shrink-0" />
                                            {tab.label}
                                        </Tab>
                                    );
                                })}
                            </TabList>
                        }
                    >
                        <TabPanel id="gifts" className="xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
                            <GiftPanel data={data.gifts} className="h-[480px] xl:h-auto xl:min-h-0 xl:flex-1" />
                        </TabPanel>
                        <TabPanel id="danmaku" className="xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
                            <DanmakuPanel data={data.danmaku} className="h-[480px] xl:h-auto xl:min-h-0 xl:flex-1" />
                        </TabPanel>
                        <TabPanel id="guards" className="xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
                            <GuardPanel data={data.guards} className="h-[480px] xl:h-auto xl:min-h-0 xl:flex-1" />
                        </TabPanel>
                    </SectionCard>
                </Tabs>

                <Tabs defaultSelectedKey="highlights" className="min-w-0 xl:flex xl:min-h-0 xl:flex-col">
                    <SectionCard
                        className="xl:flex xl:min-h-0 xl:flex-1 xl:flex-col"
                        bodyClassName="flex min-h-0 flex-col xl:flex-1"
                    >
                        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
                            <TabList aria-label="侧栏面板切换">
                                <Tab id="highlights">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    重点事件
                                </Tab>
                                <Tab id="danmaku-rank">弹幕榜</Tab>
                                <Tab id="gift-rank">礼物榜</Tab>
                            </TabList>
                            <span className="hidden shrink-0 text-[11px] text-muted-foreground 2xl:block">SC/上舰/¥{BIG_GIFT_CNY}+</span>
                        </div>
                        <TabPanel id="highlights" className="flex h-[420px] min-h-0 flex-col xl:h-auto xl:flex-1">
                            <HighlightsList
                                superChats={data.superChats}
                                guards={data.guards}
                                gifts={data.gifts}
                                roomId={data.broadcaster?.room_id}
                            />
                        </TabPanel>
                        <TabPanel id="danmaku-rank" className="flex h-[420px] min-h-0 flex-col xl:h-auto xl:flex-1">
                            <RankingList
                                items={data.topDanmaku.map((item) => ({ uname: item.uname, uface: item.uface, value: item.count, label: `${item.count} 条` }))}
                            />
                        </TabPanel>
                        <TabPanel id="gift-rank" className="flex h-[420px] min-h-0 flex-col xl:h-auto xl:flex-1">
                            <RankingList
                                items={data.topGifts.map((item) => ({ uname: item.uname, uface: item.uface, value: item.total, label: formatCurrency(item.total) }))}
                            />
                        </TabPanel>
                    </SectionCard>
                </Tabs>
            </section>
        </div>
    );
}
