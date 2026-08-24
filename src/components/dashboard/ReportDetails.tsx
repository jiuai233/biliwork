"use client";

import { Clock, Coins, Gift, MessageSquare, Radio, Shield, Sparkles, Trophy } from "lucide-react";
import { Table } from "@heroui/react";

import { Avatar } from "@/components/ui/avatar";
import { RankingList } from "@/components/dashboard/RankingList";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListPager, useClientPager } from "@/components/shared/ListPager";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatCard } from "@/components/shared/StatCard";
import { Tab, TabList, TabPanel, Tabs } from "@/components/shared/tabs";
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

const weekDays = ["一", "二", "三", "四", "五", "六", "日"];

function Delta({ cur, prev }: { cur: number; prev: number | undefined }) {
    if (prev === undefined || prev === 0) {
        return <span className="text-muted-foreground">较上周 --</span>;
    }
    const pct = Math.round(((cur - prev) / prev) * 100);
    if (pct === 0) return <span>较上周 持平</span>;
    return (
        <span>
            较上周{" "}
            <span className={cn("font-semibold", pct > 0 ? "text-profit" : "text-loss")}>
                {pct > 0 ? "↑" : "↓"} {Math.abs(pct)}%
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
    const sessionPager = useClientPager(sessions, 10);
    const highlightPager = useClientPager(highlights, 10);
    const dayTotal = overview.daily.reduce((sum, d) => sum + d.income, 0);
    const maxDay = Math.max(...overview.daily.map((d) => d.income), 1);

    return (
        <Tabs defaultSelectedKey="overview" className="flex min-w-0 flex-col gap-4">
            <TabList aria-label="周报视图">
                <Tab id="overview">
                    <Coins className="h-3.5 w-3.5" />
                    概览
                </Tab>
                <Tab id="ranking">
                    <Trophy className="h-3.5 w-3.5" />
                    金主榜
                </Tab>
                <Tab id="sessions">
                    <Radio className="h-3.5 w-3.5" />
                    场次 {sessions.length}
                </Tab>
                <Tab id="highlights">
                    <Sparkles className="h-3.5 w-3.5" />
                    高光 {highlights.length}
                </Tab>
            </TabList>

            <TabPanel id="overview" className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        label="总营收"
                        value={formatCurrency(overview.totalIncome)}
                        icon={<Coins className="h-4 w-4" />}
                        tone="amber"
                        delta={<Delta cur={overview.totalIncome} prev={overview.prevTotalIncome} />}
                    />
                    <StatCard
                        label="开播次数"
                        value={overview.sessionCount}
                        icon={<Radio className="h-4 w-4" />}
                        tone="emerald"
                        delta={<Delta cur={overview.sessionCount} prev={overview.prevSessionCount} />}
                    />
                    <StatCard
                        label="总时长"
                        value={formatDuration(overview.durationMin, "0m")}
                        icon={<Clock className="h-4 w-4" />}
                        tone="blue"
                    />
                    <StatCard
                        label="弹幕"
                        value={overview.danmakuCount.toLocaleString()}
                        icon={<MessageSquare className="h-4 w-4" />}
                        tone="sky"
                        delta={<Delta cur={overview.danmakuCount} prev={overview.prevDanmakuCount} />}
                    />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <StatCard
                        label="礼物"
                        value={formatCurrency(overview.giftIncome)}
                        icon={<Gift className="h-4 w-4" />}
                        tone="pink"
                        delta={<Delta cur={overview.giftIncome} prev={overview.prevGiftIncome} />}
                    />
                    <StatCard
                        label="舰长"
                        value={formatCurrency(overview.guardIncome)}
                        icon={<Shield className="h-4 w-4" />}
                        tone="indigo"
                        delta={<Delta cur={overview.guardIncome} prev={overview.prevGuardIncome} />}
                    />
                    <StatCard
                        label="SC"
                        value={formatCurrency(overview.scIncome)}
                        icon={<Sparkles className="h-4 w-4" />}
                        tone="yellow"
                        delta={<Delta cur={overview.scIncome} prev={overview.prevScIncome} />}
                    />
                </div>
                <SectionCard title="每日营收" accent="bg-primary">
                    <div className="flex h-56 items-end gap-3 px-6 pt-6">
                        {overview.daily.map((d, i) => (
                            <div key={d.ts} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                                <span className="h-5 text-xs text-muted-foreground tabular-nums">
                                    {d.income > 0 ? formatCurrency(d.income) : ""}
                                </span>
                                <div
                                    className="w-full max-w-16 rounded-md bg-primary/60 transition-colors hover:bg-primary"
                                    style={{ height: `${Math.max((d.income / maxDay) * 140, d.income > 0 ? 6 : 0)}px` }}
                                    title={formatCurrency(d.income)}
                                />
                                <span className="text-xs text-muted-foreground">周{weekDays[i]}</span>
                            </div>
                        ))}
                    </div>
                    <p className="px-6 pb-4 text-center text-sm text-muted-foreground tabular-nums">
                        本周合计 {formatCurrency(dayTotal)}
                    </p>
                </SectionCard>
            </TabPanel>

            <TabPanel id="ranking">
                <SectionCard title="本周金主榜" icon={<Trophy className="h-5 w-5 text-primary" />}>
                    <RankingList
                        items={topGifts.map((g) => ({
                            uname: g.uname,
                            uface: g.uface,
                            value: g.total,
                            label: formatCurrency(g.total),
                        }))}
                        totalLabel={topGifts.length > 0 ? "按礼物 + 舰长 + SC 合计，最多 10 位" : undefined}
                        className="max-h-none"
                    />
                </SectionCard>
            </TabPanel>

            <TabPanel id="sessions" className="flex flex-col">
                <SectionCard title={`场次明细 · ${sessions.length} 场`} accent="bg-emerald-500">
                    {sessions.length === 0 ? (
                        <EmptyState title="本周暂无开播记录" description="换到上一周，或去开播记录核对场次。" />
                    ) : (
                        <>
                            <div data-testid="report-sessions-viewport" className="dark-scrollbar overflow-auto">
                                <Table variant="secondary" className="min-w-[680px]">
                                    <Table.Content aria-label="本周场次" className={tableChrome}>
                                        <Table.Header>
                                            <Table.Column id="start" isRowHeader className="w-[170px]">开播时间</Table.Column>
                                            <Table.Column id="title">标题</Table.Column>
                                            <Table.Column id="duration" className="w-[90px]">时长</Table.Column>
                                            <Table.Column id="income" className="w-[120px] text-right">营收</Table.Column>
                                        </Table.Header>
                                        <Table.Body>
                                            {sessionPager.slice.map((s) => (
                                                <Table.Row key={s.id} id={String(s.id)}>
                                                    <Table.Cell className="font-medium tabular-nums text-emerald-400">
                                                        {formatDateTime(s.startTs)}
                                                        {!s.endTs && <span className="ml-2 text-xs">直播中</span>}
                                                    </Table.Cell>
                                                    <Table.Cell className="max-w-[260px] truncate text-foreground">
                                                        <span title={s.title || undefined}>{s.title || "-"}</span>
                                                    </Table.Cell>
                                                    <Table.Cell className="text-secondary-foreground">{formatDuration(s.duration)}</Table.Cell>
                                                    <Table.Cell className="text-right font-bold text-money tabular-nums">
                                                        {formatCurrency(s.totalIncome)}
                                                    </Table.Cell>
                                                </Table.Row>
                                            ))}
                                        </Table.Body>
                                    </Table.Content>
                                </Table>
                            </div>
                            <ListPager
                                total={sessionPager.total}
                                page={sessionPager.page}
                                pageCount={sessionPager.pageCount}
                                pageSize={sessionPager.pageSize}
                                onPageChange={sessionPager.setPage}
                                onPageSizeChange={sessionPager.setPageSize}
                            />
                        </>
                    )}
                </SectionCard>
            </TabPanel>

            <TabPanel id="highlights" className="flex flex-col">
                <SectionCard title={`高光时刻 · ${highlights.length} 条`} accent="bg-yellow-500">
                    {highlights.length === 0 ? (
                        <EmptyState title="本周暂无高光时刻" description="礼物、上舰和 SC 会出现在这里。" />
                    ) : (
                        <>
                            <div data-testid="report-highlights-viewport" className="dark-scrollbar">
                                {highlightPager.slice.map((t) => {
                                    const tone =
                                        t.type === "super_chat"
                                            ? "border-red-500/40 bg-red-500/10 text-red-300"
                                            : t.type === "guard"
                                                ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
                                                : "border-pink-500/40 bg-pink-500/10 text-pink-300";
                                    const label = t.type === "super_chat" ? "SC" : t.type === "guard" ? "上舰" : "礼物";
                                    return (
                                        <div key={t.id} className="flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0">
                                            <span className={cn("shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] font-bold", tone)}>{label}</span>
                                            <Avatar src={t.uface} name={t.uname} className="h-6 w-6" />
                                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground" title={t.uname || "匿名用户"}>
                                                {t.uname || "匿名用户"}
                                            </span>
                                            <span className="hidden max-w-[280px] truncate text-sm text-muted-foreground sm:block" title={t.content}>
                                                {t.content}
                                            </span>
                                            <span className="shrink-0 text-sm font-bold text-money tabular-nums">{formatCurrency(t.price)}</span>
                                            <span className="w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                                                {new Date(t.ts).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <ListPager
                                total={highlightPager.total}
                                page={highlightPager.page}
                                pageCount={highlightPager.pageCount}
                                pageSize={highlightPager.pageSize}
                                onPageChange={highlightPager.setPage}
                                onPageSizeChange={highlightPager.setPageSize}
                            />
                        </>
                    )}
                </SectionCard>
            </TabPanel>
        </Tabs>
    );
}
