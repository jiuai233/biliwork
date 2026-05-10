'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { endOfDay, startOfDay } from "date-fns";
import { toast } from "sonner";
import { Avatar, Button, Chip } from "@heroui/react";
import {
    Loader2,
    MessageSquareText,
    RefreshCcw,
    Wifi,
    WifiOff,
} from "lucide-react";
import { getDashboardData } from "./actions";
import { AnalyticsDateRangePicker } from "@/components/dashboard/AnalyticsDateRangePicker";
import { DanmakuPanel } from "@/components/dashboard/DanmakuPanel";
import { GiftPanel } from "@/components/dashboard/GiftPanel";
import { GuardPanel } from "@/components/dashboard/GuardPanel";
import { StatsPanel } from "@/components/dashboard/StatsPanel";
import { useSSE } from "@/hooks/useSSE";
import { Broadcaster, DashboardStats, Danmaku, Gift, Guard, SuperChat } from "@/lib/types";

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

function SectionTitle({ accent, title }: { accent: string; title: string }) {
    return (
        <div className="mb-3 flex items-center">
            <h3 className="flex items-center gap-3 text-lg font-extrabold text-white">
                <span className={`h-6 w-1 rounded-full ${accent}`} />
                {title}
            </h3>
        </div>
    );
}

function formatClock(ts?: number | null) {
    return ts
        ? new Date(ts).toLocaleTimeString("zh-CN", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        })
        : "--:--:--";
}

function guardName(level?: number | null) {
    if (level === 1) return "总督";
    if (level === 2) return "提督";
    if (level === 3) return "舰长";
    return "";
}

type FeedItem =
    | {
        type: "danmaku";
        id: string;
        ts: number;
        uname: string;
        uface: string | null;
        message: string;
        guardLevel: number;
        fansMedalLevel: number;
        fansMedalName: string | null;
    }
    | {
        type: "sc";
        id: string;
        ts: number;
        uname: string;
        uface: string | null;
        message: string;
        amount: number;
    };

function LiveFeedPanel({
    danmaku,
    superChats,
}: {
    danmaku: Danmaku[];
    superChats: SuperChat[];
}) {
    const feed = useMemo<FeedItem[]>(() => {
        const danmakuItems = danmaku.map((item) => ({
            type: "danmaku" as const,
            id: `dm-${item.msg_id || item.id}`,
            ts: item.ts || new Date(item.created_at).getTime(),
            uname: item.uname || "匿名用户",
            uface: item.uface,
            message: item.msg || "",
            guardLevel: item.guard_level,
            fansMedalLevel: item.fans_medal_level,
            fansMedalName: item.fans_medal_name,
        }));
        const scItems = superChats.map((item) => ({
            type: "sc" as const,
            id: `sc-${item.msg_id || item.id}`,
            ts: item.ts || new Date(item.created_at).getTime(),
            uname: item.uname || "匿名用户",
            uface: item.uface,
            message: item.message || "",
            amount: item.rmb,
        }));

        return [...danmakuItems, ...scItems]
            .sort((a, b) => b.ts - a.ts)
            .slice(0, 14);
    }, [danmaku, superChats]);

    return (
        <aside className="flex min-h-[760px] flex-col rounded-2xl border border-white/10 bg-slate-950/60 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <div className="border-b border-white/10 px-5 py-4">
                <h3 className="flex items-center gap-3 text-lg font-extrabold text-white">
                    <span className="h-6 w-1 rounded-full bg-violet-500" />
                    实时弹幕
                </h3>
            </div>

            <div className="dark-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-4">
                {feed.map((item) => {
                    if (item.type === "sc") {
                        return (
                            <div key={item.id} className="rounded-xl border border-red-400/20 bg-red-500/10 p-3">
                                <div className="flex items-start gap-3">
                                    <Avatar className="h-10 w-10 border border-red-300/40">
                                        <Avatar.Image src={item.uface ?? undefined} referrerPolicy="no-referrer" />
                                        <Avatar.Fallback>{item.uname[0] ?? "?"}</Avatar.Fallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="truncate text-sm font-extrabold text-red-100">{item.uname}</span>
                                            <span className="shrink-0 text-lg font-black text-red-300">¥{item.amount}</span>
                                        </div>
                                        <div className="mt-0.5 text-xs text-slate-400">{formatClock(item.ts)}</div>
                                        <p className="mt-2 rounded-lg bg-black/20 px-3 py-2 text-sm font-medium text-slate-100">{item.message}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={item.id} className="flex items-start gap-3">
                            <Avatar className="h-8 w-8 border border-white/10">
                                <Avatar.Image src={item.uface ?? undefined} referrerPolicy="no-referrer" />
                                <Avatar.Fallback>{item.uname[0] ?? "?"}</Avatar.Fallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="truncate text-sm font-bold text-slate-100">{item.uname}</span>
                                    {item.guardLevel > 0 && (
                                        <Chip size="sm" variant="soft" className="h-5 bg-amber-400/15 px-2 text-[11px] font-bold text-amber-300">
                                            {guardName(item.guardLevel)}
                                        </Chip>
                                    )}
                                    {item.fansMedalLevel > 0 && (
                                        <Chip size="sm" variant="soft" className="h-5 bg-slate-700/70 px-2 text-[11px] text-slate-300">
                                            {item.fansMedalName} {item.fansMedalLevel}
                                        </Chip>
                                    )}
                                </div>
                                <p className="mt-1 break-all text-sm font-medium leading-6 text-white">{item.message}</p>
                            </div>
                            <span className="shrink-0 text-[11px] text-slate-500">{formatClock(item.ts)}</span>
                        </div>
                    );
                })}

                {feed.length === 0 && (
                    <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center text-slate-400">
                        <div className="mb-4 rounded-full bg-white/[0.06] p-6 text-slate-500">
                            <MessageSquareText className="h-12 w-12" />
                        </div>
                        <div className="text-base font-medium text-slate-300">暂无弹幕</div>
                        <p className="mt-2 text-sm">数据将在直播中更新</p>
                    </div>
                )}
            </div>
        </aside>
    );
}

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
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
        <div className="space-y-5">
            <section className="relative rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.16),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.82))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.30)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_18%,rgba(56,189,248,0.10),transparent_28%)]" />
                <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                        <h1 className="text-3xl font-black tracking-normal text-white">
                            欢迎回来，{data.broadcaster?.uname ?? "主播"}
                        </h1>
                        <p className="mt-2 text-sm font-medium text-slate-400">实时掌握直播动态，提升直播表现</p>
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
                            isDisabled={loading}
                            aria-label="刷新"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] p-0 text-slate-200 hover:bg-white/[0.09]"
                        >
                            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </div>
            </section>

            <div className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/45 p-4 md:flex">
                <Avatar className="h-12 w-12 border-2 border-violet-400/70 shadow-lg shadow-violet-900/25">
                    <Avatar.Image src={data.broadcaster?.uface ?? undefined} referrerPolicy="no-referrer" />
                    <Avatar.Fallback>{data.broadcaster?.uname?.[0] ?? "主"}</Avatar.Fallback>
                </Avatar>
                <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-white">{data.broadcaster?.uname}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                        <span>Room ID: {data.broadcaster?.room_id ?? "-"}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-600" />
                        <span className={data.broadcaster?.active ? "text-emerald-300" : "text-slate-500"}>
                            {data.broadcaster?.active ? "监控中" : "已暂停"}
                        </span>
                    </div>
                </div>
            </div>

            {data.stats && <StatsPanel stats={data.stats} />}

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <div>
                        <SectionTitle accent="bg-pink-500" title="最新礼物" />
                        <GiftPanel data={data.gifts} />
                    </div>

                    <div>
                        <SectionTitle accent="bg-blue-500" title="实时弹幕" />
                        <DanmakuPanel data={data.danmaku} />
                    </div>

                    <div>
                        <SectionTitle accent="bg-indigo-500" title="最近上舰" />
                        <GuardPanel data={data.guards} />
                    </div>

                </div>

                <LiveFeedPanel danmaku={data.danmaku} superChats={data.superChats} />
            </div>
        </div>
    );
}
