import Link from "next/link";
import { addWeeks, format, startOfWeek } from "date-fns";
import { CalendarRange, Clock, Coins, Gift, MessageSquare, Radio, Shield, Sparkles, Trophy } from "lucide-react";
import { Table } from "@heroui/react";

import { requireAuth } from "@/lib/auth";
import { getBroadcasterByUid } from "@/lib/data";
import { parseDateParam } from "@/lib/date-params";
import { getWeeklyReport } from "@/lib/services/report";
import { Avatar } from "@/components/ui/avatar";
import { RankingList } from "@/components/dashboard/RankingList";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatCard } from "@/components/shared/StatCard";
import { tableChrome } from "@/components/shared/table";
import { formatCurrency, formatDateTime, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = 'force-dynamic';

type ReportPageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const WEEK_MS = 7 * 86_400_000;
const weekDays = ["一", "二", "三", "四", "五", "六", "日"];

function formatWeekParam(date: Date) {
    return format(date, "yyyy-MM-dd");
}

function Delta({ cur, prev }: { cur: number; prev: number | undefined }) {
    if (prev === undefined || prev === 0) {
        return <span className="text-muted-foreground">较上周 --</span>;
    }
    const pct = Math.round(((cur - prev) / prev) * 100);
    if (pct === 0) return <span>较上周 持平</span>;
    return (
        <span>
            较上周{" "}
            <span className={cn("font-semibold", pct > 0 ? "text-emerald-400" : "text-red-400")}>
                {pct > 0 ? "↑" : "↓"} {Math.abs(pct)}%
            </span>
        </span>
    );
}

export default async function ReportPage({ searchParams }: ReportPageProps) {
    const uid = await requireAuth();
    const broadcaster = await getBroadcasterByUid(uid);
    const params = await searchParams;

    const weekParam = Array.isArray(params?.week) ? params.week[0] : params?.week;
    const weekStart = startOfWeek(parseDateParam(weekParam) ?? new Date(), { weekStartsOn: 1 });
    const weekStartMs = weekStart.getTime();
    const weekEndMs = weekStartMs + WEEK_MS - 1;

    if (!broadcaster || !broadcaster.room_id) {
        return <div className="p-8">未找到主播信息</div>;
    }

    const report = await getWeeklyReport(broadcaster.room_id, weekStartMs);
    const { stats, prevStats } = report;
    const dayTotal = report.daily.reduce((sum, d) => sum + d.income, 0);
    const maxDay = Math.max(...report.daily.map((d) => d.income), 1);

    const prevUrl = `/dashboard/report?week=${formatWeekParam(addWeeks(weekStart, -1))}`;
    const currentUrl = `/dashboard/report`;

    return (
        <div className="min-w-0 space-y-4 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:space-y-0 lg:gap-4 lg:overflow-hidden">
            <PageHeader
                icon={<CalendarRange className="h-5 w-5" />}
                iconClass="bg-primary/15 text-primary"
                title="周报"
                description={
                    <span>
                        {format(weekStart, "M月d日")} ~ {format(new Date(weekEndMs), "M月d日")} · 本周复盘
                    </span>
                }
                actions={
                    <div className="flex items-center gap-2">
                        <Link
                            href={prevUrl}
                            className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                        >
                            上一周
                        </Link>
                        <Link
                            href={currentUrl}
                            className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                        >
                            本周
                        </Link>
                    </div>
                }
            />

            <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
                <StatCard label="开播次数" value={stats.sessionCount} icon={<Radio className="h-4 w-4" />} tone="emerald" delta={<Delta cur={stats.sessionCount} prev={report.prevSessionCount} />} className="min-h-0 p-3" />
                <StatCard label="总时长" value={formatDuration(stats.durationMin, "0m")} icon={<Clock className="h-4 w-4" />} tone="blue" delta={<Delta cur={stats.durationMin} prev={undefined} />} className="min-h-0 p-3" />
                <StatCard label="总营收" value={formatCurrency(stats.totalIncome)} icon={<Coins className="h-4 w-4" />} tone="amber" delta={<Delta cur={stats.totalIncome} prev={prevStats?.totalIncome} />} className="min-h-0 p-3" />
                <StatCard label="礼物" value={formatCurrency(stats.giftIncome)} icon={<Gift className="h-4 w-4" />} tone="pink" delta={<Delta cur={stats.giftIncome} prev={prevStats?.giftIncome} />} className="min-h-0 p-3" />
                <StatCard label="舰长" value={formatCurrency(stats.guardIncome)} icon={<Shield className="h-4 w-4" />} tone="indigo" delta={<Delta cur={stats.guardIncome} prev={prevStats?.guardIncome} />} className="min-h-0 p-3" />
                <StatCard label="SC" value={formatCurrency(stats.scIncome)} icon={<Sparkles className="h-4 w-4" />} tone="yellow" delta={<Delta cur={stats.scIncome} prev={prevStats?.scIncome} />} className="min-h-0 p-3" />
                <StatCard label="弹幕" value={stats.danmakuCount.toLocaleString()} icon={<MessageSquare className="h-4 w-4" />} tone="sky" delta={<Delta cur={stats.danmakuCount} prev={prevStats?.danmakuCount} />} className="min-h-0 p-3" />
            </div>

            <div className="grid shrink-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,1fr)]">
                <SectionCard title="每日营收" accent="bg-primary">
                    <div className="flex h-[130px] items-end gap-2 px-4 pt-2">
                        {report.daily.map((d, i) => (
                            <div key={d.ts} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                                <span className="h-4 text-[10px] text-muted-foreground tabular-nums">
                                    {d.income > 0 ? formatCurrency(d.income) : ""}
                                </span>
                                <div
                                    className="w-full rounded-sm bg-primary/60 transition-colors hover:bg-primary"
                                    style={{ height: `${Math.max((d.income / maxDay) * 70, d.income > 0 ? 3 : 0)}px` }}
                                    title={formatCurrency(d.income)}
                                />
                                <span className="text-[10px] text-muted-foreground">周{weekDays[i]}</span>
                            </div>
                        ))}
                    </div>
                    <p className="px-4 pb-2 text-center text-xs text-muted-foreground tabular-nums">本周合计 {formatCurrency(dayTotal)}</p>
                </SectionCard>

                <SectionCard
                    title="本周金主榜"
                    icon={<Trophy className="h-5 w-5 text-primary" />}
                    bodyClassName="flex min-h-0 flex-col"
                >
                    <RankingList
                        items={report.topGifts.map((g) => ({ uname: g.uname, uface: g.uface, value: g.total, label: formatCurrency(g.total) }))}
                        totalLabel={report.topGifts.length > 0 ? "按礼物+舰长+SC 合计" : undefined}
                        className="max-h-[200px]"
                    />
                </SectionCard>
            </div>

            <SectionCard
                title={`高光时刻（${report.highlights.length}）`}
                icon={<Sparkles className="h-5 w-5 text-primary" />}
                bodyClassName="dark-scrollbar max-h-[260px] overflow-y-auto"
            >
                {report.highlights.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">本周暂无高光时刻</div>
                ) : (
                    report.highlights.map((t) => {
                        const tone =
                            t.type === "super_chat"
                                ? "border-red-500/40 bg-red-500/10 text-red-300"
                                : t.type === "guard"
                                    ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
                                    : "border-pink-500/40 bg-pink-500/10 text-pink-300";
                        const label = t.type === "super_chat" ? "SC" : t.type === "guard" ? "上舰" : "礼物";
                        return (
                            <div key={t.id} className="flex items-center gap-2.5 border-b border-border/60 px-4 py-2 last:border-b-0">
                                <span className={cn("shrink-0 rounded border px-1.5 py-px text-[10px] font-bold", tone)}>{label}</span>
                                <Avatar src={t.uface} name={t.uname} className="h-5 w-5" />
                                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{t.uname || "匿名用户"}</span>
                                <span className="hidden max-w-[240px] truncate text-xs text-muted-foreground sm:block">{t.content}</span>
                                <span className="shrink-0 text-[13px] font-bold text-money tabular-nums">{formatCurrency(t.price)}</span>
                                <span className="w-14 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">
                                    {new Date(t.ts).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })}
                                </span>
                            </div>
                        );
                    })
                )}
            </SectionCard>

            <div className="min-w-0 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
                <SectionCard
                    title={`场次明细（${report.sessions.length}）`}
                    bodyClassName="dark-scrollbar min-h-0 flex-1 overflow-auto"
                >
                    <Table variant="secondary" className="min-w-[680px]">
                        <Table.Content aria-label="本周场次" className={tableChrome}>
                            <Table.Header>
                                <Table.Column id="start" isRowHeader className="w-[170px]">开播时间</Table.Column>
                                <Table.Column id="title">标题</Table.Column>
                                <Table.Column id="duration" className="w-[90px]">时长</Table.Column>
                                <Table.Column id="income" className="w-[120px] text-right">营收</Table.Column>
                            </Table.Header>
                            <Table.Body>
                                {report.sessions.map((s) => (
                                    <Table.Row key={s.id} id={s.id}>
                                        <Table.Cell className="font-medium text-emerald-400">
                                            {formatDateTime(s.startTs)}
                                            {!s.endTs && <span className="ml-2 text-xs">直播中</span>}
                                        </Table.Cell>
                                        <Table.Cell className="max-w-[260px] truncate text-foreground">{s.title || "-"}</Table.Cell>
                                        <Table.Cell className="text-secondary-foreground">{formatDuration(s.duration)}</Table.Cell>
                                        <Table.Cell className="text-right font-bold text-money tabular-nums">{formatCurrency(s.totalIncome)}</Table.Cell>
                                    </Table.Row>
                                ))}
                                {report.sessions.length === 0 && (
                                    <Table.Row id="empty">
                                        <Table.Cell colSpan={4} className="py-10 text-center text-muted-foreground">
                                            本周暂无开播记录
                                        </Table.Cell>
                                    </Table.Row>
                                )}
                            </Table.Body>
                        </Table.Content>
                    </Table>
                </SectionCard>
            </div>
        </div>
    );
}
