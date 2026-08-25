"use client";

import Link from "next/link";
import { useState } from "react";
import {
    Calendar,
    Clock,
    Coins,
    Crown,
    ExternalLink,
    Flame,
    Gift,
    MessageSquare,
    Radio,
    Shield,
    Sparkles,
    Trophy,
    Users,
    Zap,
} from "lucide-react";
import { Table } from "@heroui/react";

import { Avatar } from "@/components/ui/avatar";
import { RankingList } from "@/components/dashboard/RankingList";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListPager, useClientPager } from "@/components/shared/ListPager";
import { tableChrome } from "@/components/shared/table";
import { formatCurrency, formatDateTime, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ReportSessionRow = {
    id: number;
    startTs: number;
    endTs: number | null;
    duration: number;
    title: string | null;
    totalIncome: number;
};

export type ReportHighlightRow = {
    id: string;
    type: "gift" | "guard" | "super_chat";
    uname: string;
    uface: string;
    content: string;
    price: number;
    ts: number;
};

export type ReportOverview = {
    sessionCount: number;
    prevSessionCount: number;
    durationMin: number;
    danmakuCount: number;
    prevDanmakuCount: number | undefined;
    totalIncome: number;
    prevTotalIncome: number | undefined;
    giftIncome: number;
    prevGiftIncome: number | undefined;
    guardIncome: number;
    prevGuardIncome: number | undefined;
    scIncome: number;
    prevScIncome: number | undefined;
    daily: { ts: number; income: number }[];
};

export type ReportRankRow = {
    uname: string;
    uface: string;
    total: number;
};

const weekDayNames = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

function DeltaBadge({ cur, prev }: { cur: number; prev: number | undefined }) {
    if (prev === undefined || prev === 0) {
        return <span className="text-[11px] text-muted-foreground">较上周 --</span>;
    }
    const pct = Math.round(((cur - prev) / prev) * 100);
    if (pct === 0) return <span className="text-[11px] text-muted-foreground">较上周 持平</span>;
    const isUp = pct > 0;
    return (
        <span className="flex items-center gap-0.5 text-[11px]">
            <span className="text-muted-foreground">较上周</span>
            <span className={cn("font-bold font-mono", isUp ? "text-emerald-500" : "text-loss")}>
                {isUp ? "↑" : "↓"} {Math.abs(pct)}%
            </span>
        </span>
    );
}

export function ReportDetails({
    overview,
    topGifts,
    sessions,
    highlights,
}: {
    overview: ReportOverview;
    topGifts: ReportRankRow[];
    sessions: ReportSessionRow[];
    highlights: ReportHighlightRow[];
}) {
    const [sideTab, setSideTab] = useState<"ranking" | "highlights">("ranking");
    const sessionPager = useClientPager(sessions, 10);
    const highlightPager = useClientPager(highlights, 10);

    const dayTotal = overview.daily.reduce((sum, d) => sum + d.income, 0);
    const maxDay = Math.max(...overview.daily.map((d) => d.income), 1);
    const peakDay = overview.daily.reduce<{ income: number; ts: number; dayIndex: number }>(
        (max, d, i) => (d.income > max.income ? { income: d.income, ts: d.ts, dayIndex: i } : max),
        { income: -1, ts: 0, dayIndex: 0 },
    );
    const activeDaysCount = overview.daily.filter((d) => d.income > 0).length;

    return (
        <div className="flex flex-col flex-1 min-h-0 gap-3">
            {/* Section 1: Unified Weekly Executive Pulse (KPIs + 7-Day Trend Merged) */}
            <div className="rounded-xl border border-border bg-card p-3.5 px-4 shadow-xs shrink-0">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    {/* Left: 4 Key Metrics + Breakdown */}
                    <div className="space-y-2.5 lg:col-span-7">
                        <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                            <span className="text-xs font-bold text-foreground">本周核心指标</span>
                            <span className="text-[11px] font-mono text-muted-foreground">
                                日均营收 {formatCurrency(overview.totalIncome / 7)}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Metric 1: Total Revenue */}
                            <div className="space-y-0.5">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1 font-medium">
                                        <Coins className="h-3.5 w-3.5 text-amber-500" />
                                        本周总营收
                                    </span>
                                    <DeltaBadge cur={overview.totalIncome} prev={overview.prevTotalIncome} />
                                </div>
                                <div className="text-xl font-bold font-mono tracking-tight text-foreground">
                                    {formatCurrency(overview.totalIncome)}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                                    <span>礼物 <b className="font-mono text-foreground">{formatCurrency(overview.giftIncome)}</b></span>
                                    <span className="text-border">•</span>
                                    <span>舰长 <b className="font-mono text-foreground">{formatCurrency(overview.guardIncome)}</b></span>
                                    <span className="text-border">•</span>
                                    <span>SC <b className="font-mono text-foreground">{formatCurrency(overview.scIncome)}</b></span>
                                </div>
                            </div>

                            {/* Metric 2: Sessions */}
                            <div className="space-y-0.5">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1 font-medium">
                                        <Radio className="h-3.5 w-3.5 text-emerald-500" />
                                        开播总场次
                                    </span>
                                    <DeltaBadge cur={overview.sessionCount} prev={overview.prevSessionCount} />
                                </div>
                                <div className="text-xl font-bold font-mono tracking-tight text-foreground">
                                    {overview.sessionCount} <span className="text-xs font-normal text-muted-foreground">场</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                    {overview.sessionCount > 0
                                        ? `场均营收 ${formatCurrency(overview.totalIncome / overview.sessionCount)}`
                                        : "本周暂未开播"}
                                </div>
                            </div>

                            {/* Metric 3: Duration */}
                            <div className="space-y-0.5">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1 font-medium">
                                        <Clock className="h-3.5 w-3.5 text-sky-500" />
                                        开播总时长
                                    </span>
                                </div>
                                <div className="text-xl font-bold font-mono tracking-tight text-foreground">
                                    {formatDuration(overview.durationMin, "0分钟")}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                    {overview.sessionCount > 0
                                        ? `场均时长 ${formatDuration(Math.round(overview.durationMin / overview.sessionCount))}`
                                        : "日均 0小时"}
                                </div>
                            </div>

                            {/* Metric 4: Danmaku */}
                            <div className="space-y-0.5">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1 font-medium">
                                        <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
                                        弹幕互动量
                                    </span>
                                    <DeltaBadge cur={overview.danmakuCount} prev={overview.prevDanmakuCount} />
                                </div>
                                <div className="text-xl font-bold font-mono tracking-tight text-foreground">
                                    {overview.danmakuCount.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">条</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                    {overview.durationMin > 0
                                        ? `互动密度 ${Math.round(overview.danmakuCount / (overview.durationMin / 60))} 条/小时`
                                        : "暂无数据"}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: 7-Day Rhythm Trend (Compact) */}
                    <div className="flex flex-col justify-between space-y-2 pt-3 border-t border-border lg:col-span-5 lg:border-t-0 lg:border-l lg:pl-4 lg:pt-0">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-xs font-bold text-foreground">
                                <Calendar className="h-3.5 w-3.5 text-primary" />
                                7天开播与营收走势
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                {peakDay.income > 0 && (
                                    <span>
                                        最高: <b className="text-foreground font-mono">{weekDayNames[peakDay.dayIndex]} ({formatCurrency(peakDay.income)})</b>
                                    </span>
                                )}
                                <span className="text-border">•</span>
                                <span>活跃: <b className="text-foreground font-mono">{activeDaysCount}/7天</b></span>
                            </div>
                        </div>

                        {/* Mini 7-Day Rhythm Bar */}
                        <div className="flex h-16 items-end gap-2 sm:gap-3 pt-1">
                            {overview.daily.map((d, i) => {
                                const heightPct = maxDay > 0 ? (d.income / maxDay) * 100 : 0;
                                const isPeak = peakDay.income > 0 && d.income === peakDay.income;
                                return (
                                    <div key={d.ts} className="group relative flex min-w-0 flex-1 flex-col items-center gap-1">
                                        <span className="h-2.5 text-[9px] font-mono text-muted-foreground truncate">
                                            {d.income > 0 ? `¥${Math.round(d.income)}` : ""}
                                        </span>
                                        <div
                                            className={cn(
                                                "w-full max-w-7 rounded-t-sm transition-all duration-300",
                                                isPeak
                                                    ? "bg-primary shadow-xs shadow-primary/30"
                                                    : d.income > 0
                                                    ? "bg-primary/50 group-hover:bg-primary/80"
                                                    : "bg-muted/40"
                                            )}
                                            style={{ height: `${Math.max(3, (heightPct / 100) * 38)}px` }}
                                            title={`${weekDayNames[i]}: ${formatCurrency(d.income)}`}
                                        />
                                        <span className={cn("text-[10px]", isPeak ? "font-bold text-primary" : "text-muted-foreground")}>
                                            {weekDayNames[i].replace("周", "")}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex items-center justify-between border-t border-border/60 pt-1 text-[10px] text-muted-foreground">
                            <span>周一至周日走势</span>
                            <span>7天合计 <b className="font-mono text-money font-bold">{formatCurrency(dayTotal)}</b></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 2: Drilldown Grid (Sessions Table + Contributors/Highlights Side by Side - Flex Fill) */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 flex-1 min-h-[300px] lg:min-h-0">
                {/* Left: 本周场次明细列表 */}
                <div className="flex h-full min-h-[260px] flex-col rounded-xl border border-border bg-card shadow-xs lg:col-span-7 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border bg-card/60 px-3.5 py-2 shrink-0">
                        <div className="flex items-center gap-1.5">
                            <Radio className="h-3.5 w-3.5 text-emerald-500" />
                            <h3 className="text-xs font-bold text-foreground">本周开播场次明细</h3>
                            <span className="font-mono text-[11px] text-muted-foreground">({sessions.length} 场)</span>
                        </div>
                    </div>

                    {sessions.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center">
                            <EmptyState title="本周暂无开播记录" description="本周未检测到开播场次，可切换至上一周查看历史复盘。" />
                        </div>
                    ) : (
                        <>
                            <div className="dark-scrollbar flex-1 min-h-0 overflow-auto">
                                <Table variant="secondary" className="w-full">
                                    <Table.ScrollContainer className="w-full">
                                        <Table.Content aria-label="本周场次" className={`${tableChrome} min-w-[520px]`}>
                                            <Table.Header>
                                                <Table.Column id="start" isRowHeader className="w-[140px] pl-3.5 text-xs py-2">开播时间</Table.Column>
                                                <Table.Column id="title" className="text-xs py-2">场次标题</Table.Column>
                                                <Table.Column id="duration" className="w-[90px] text-xs py-2">时长</Table.Column>
                                                <Table.Column id="income" className="w-[100px] text-right text-xs py-2">场次营收</Table.Column>
                                                <Table.Column id="action" className="w-[80px] pr-3.5 text-right text-xs py-2">操作</Table.Column>
                                            </Table.Header>
                                            <Table.Body>
                                                {sessionPager.slice.map((s) => {
                                                    const detailUrl = `/dashboard/live/detail?start=${s.startTs}&end=${s.endTs || Date.now()}&title=${encodeURIComponent(s.title || "直播场次")}`;
                                                    return (
                                                        <Table.Row key={s.id} id={String(s.id)} className="hover:bg-accent/40 transition-colors">
                                                            <Table.Cell className="pl-3.5 py-2 font-mono text-xs text-foreground">
                                                                {formatDateTime(s.startTs)}
                                                                {!s.endTs && (
                                                                    <span className="ml-1 px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                                        直播中
                                                                    </span>
                                                                )}
                                                            </Table.Cell>
                                                            <Table.Cell className="py-2 text-xs truncate max-w-[150px]">
                                                                <span className="font-semibold text-foreground truncate block" title={s.title || undefined}>
                                                                    {s.title || "未设置标题"}
                                                                </span>
                                                            </Table.Cell>
                                                            <Table.Cell className="py-2 text-xs font-mono text-muted-foreground">
                                                                {formatDuration(s.duration)}
                                                            </Table.Cell>
                                                            <Table.Cell className="py-2 text-right font-mono font-bold text-xs text-money">
                                                                {formatCurrency(s.totalIncome)}
                                                            </Table.Cell>
                                                            <Table.Cell className="pr-3.5 py-2 text-right text-xs">
                                                                <Link
                                                                    href={detailUrl}
                                                                    className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline"
                                                                >
                                                                    <span>复盘</span>
                                                                    <ExternalLink className="h-3 w-3" />
                                                                </Link>
                                                            </Table.Cell>
                                                        </Table.Row>
                                                    );
                                                })}
                                            </Table.Body>
                                        </Table.Content>
                                    </Table.ScrollContainer>
                                </Table>
                            </div>

                            {sessions.length > 10 && (
                                <ListPager
                                    total={sessionPager.total}
                                    page={sessionPager.page}
                                    pageCount={sessionPager.pageCount}
                                    pageSize={sessionPager.pageSize}
                                    onPageChange={sessionPager.setPage}
                                    onPageSizeChange={sessionPager.setPageSize}
                                />
                            )}
                        </>
                    )}
                </div>

                {/* Right: 本周贡献与高光互动 */}
                <div className="flex h-full min-h-[260px] flex-col rounded-xl border border-border bg-card shadow-xs lg:col-span-5 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border bg-card/60 px-3.5 py-1.5 shrink-0">
                        {/* Segmented Switcher */}
                        <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
                            <button
                                type="button"
                                aria-pressed={sideTab === "ranking"}
                                onClick={() => setSideTab("ranking")}
                                className={cn(
                                    "flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold transition-colors",
                                    sideTab === "ranking"
                                        ? "bg-card text-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Trophy className="h-3 w-3 text-amber-500" />
                                <span>贡献排行 ({topGifts.length})</span>
                            </button>
                            <button
                                type="button"
                                aria-pressed={sideTab === "highlights"}
                                onClick={() => setSideTab("highlights")}
                                className={cn(
                                    "flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold transition-colors",
                                    sideTab === "highlights"
                                        ? "bg-card text-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Sparkles className="h-3 w-3 text-indigo-500" />
                                <span>高光互动 ({highlights.length})</span>
                            </button>
                        </div>
                    </div>

                    {sideTab === "ranking" ? (
                        <RankingList
                            items={topGifts.map((g) => ({
                                uname: g.uname,
                                uface: g.uface,
                                value: g.total,
                                label: formatCurrency(g.total),
                            }))}
                            tone="amber"
                            emptyTitle="本周暂无贡献排行"
                            className="flex-1 min-h-0 p-2 space-y-1.5"
                        />
                    ) : (
                        <div className="dark-scrollbar flex-1 min-h-0 overflow-y-auto">
                            {highlights.length === 0 ? (
                                <div className="flex h-full items-center justify-center">
                                    <EmptyState title="本周暂无高光时刻" description="高价值互动将自动收录在此处。" />
                                </div>
                            ) : (
                                <div className="divide-y divide-border/60">
                                    {highlightPager.slice.map((t) => (
                                        <div key={t.id} className="flex items-center justify-between p-2 px-3.5 hover:bg-accent/40 transition-colors">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <Avatar src={t.uface} name={t.uname} className="h-6 w-6 shrink-0 border border-border" />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-semibold text-foreground truncate max-w-[110px]">{t.uname}</span>
                                                        {t.type === "super_chat" && (
                                                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80">SC</span>
                                                        )}
                                                        {t.type === "guard" && (
                                                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/80">上舰</span>
                                                        )}
                                                        {t.type === "gift" && (
                                                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-pink-50 text-pink-600 dark:bg-pink-950/50 dark:text-pink-300 border border-pink-200/80">礼物</span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground truncate max-w-[180px]" title={t.content}>
                                                        {t.content}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 pl-2">
                                                <div className="font-mono font-bold text-xs text-money">{formatCurrency(t.price)}</div>
                                                <div className="text-[9px] font-mono text-muted-foreground">{formatDateTime(t.ts).split(" ")[1]}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Section 3: Weekly Operational Efficiency & Diagnostics (Compact Shrink) */}
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 shrink-0">
                <div className="rounded-xl border border-border bg-card p-2.5 px-3.5 space-y-0.5 shadow-xs">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Users className="h-3 w-3 text-pink-500" />
                        <span>付费观众人均贡献 (ARPPU)</span>
                    </div>
                    <div className="text-base font-bold font-mono text-foreground">
                        {formatCurrency(overview.totalIncome / Math.max(topGifts.length, 1))}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                        本周共 {topGifts.length} 位贡献观众
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-2.5 px-3.5 space-y-0.5 shadow-xs">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Zap className="h-3 w-3 text-amber-500" />
                        <span>时薪创收产出 (每小时)</span>
                    </div>
                    <div className="text-base font-bold font-mono text-money">
                        {formatCurrency(overview.totalIncome / Math.max(overview.durationMin / 60, 0.01))}/h
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                        {overview.durationMin > 0 ? `累计开播 ${formatDuration(overview.durationMin)}` : "暂无时长"}
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-2.5 px-3.5 space-y-0.5 shadow-xs">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Flame className="h-3 w-3 text-orange-500" />
                        <span>弹幕互动活跃密度</span>
                    </div>
                    <div className="text-base font-bold font-mono text-foreground">
                        {overview.durationMin > 0 ? (overview.danmakuCount / overview.durationMin).toFixed(1) : "0"} <span className="text-[10px] font-normal text-muted-foreground">条/分钟</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                        本周互动总弹幕 {overview.danmakuCount.toLocaleString()} 条
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-2.5 px-3.5 space-y-0.5 shadow-xs">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Crown className="h-3 w-3 text-purple-500" />
                        <span>头部榜首贡献占比</span>
                    </div>
                    <div className="text-base font-bold font-mono text-foreground">
                        {topGifts.length > 0 && overview.totalIncome > 0
                            ? `${Math.round((topGifts[0].total / overview.totalIncome) * 100)}%`
                            : "0%"}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate" title={topGifts[0] ? `榜首: ${topGifts[0].uname} (${formatCurrency(topGifts[0].total)})` : undefined}>
                        {topGifts[0]
                            ? `榜首 ${topGifts[0].uname} (${formatCurrency(topGifts[0].total)})`
                            : "本周暂无送礼用户"}
                    </div>
                </div>
            </div>
        </div>
    );
}
