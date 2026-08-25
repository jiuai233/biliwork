import Link from "next/link";
import { addWeeks, format, startOfWeek } from "date-fns";
import { CalendarRange, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

import { requireAuth } from "@/lib/auth";
import { getBroadcasterByUid } from "@/lib/data";
import { parseDateParam } from "@/lib/date-params";
import { getWeeklyReport } from "@/lib/services/report";
import { ReportDetails } from "@/components/dashboard/ReportDetails";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

type ReportPageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const WEEK_MS = 7 * 86_400_000;

function formatWeekParam(date: Date) {
    return format(date, "yyyy-MM-dd");
}

export default async function ReportPage({ searchParams }: ReportPageProps) {
    const uid = await requireAuth();
    const broadcaster = await getBroadcasterByUid(uid);
    const params = await searchParams;

    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekParam = Array.isArray(params?.week) ? params.week[0] : params?.week;
    const weekStart = startOfWeek(parseDateParam(weekParam) ?? today, { weekStartsOn: 1 });
    const weekStartMs = weekStart.getTime();
    const weekEndMs = weekStartMs + WEEK_MS - 1;

    const isCurrentWeek = weekStartMs >= currentWeekStart.getTime();
    const weekNumber = format(weekStart, "I");

    if (!broadcaster || !broadcaster.room_id) {
        return <div className="p-8">未找到主播信息</div>;
    }

    const report = await getWeeklyReport(broadcaster.room_id, weekStartMs);
    const { stats, prevStats } = report;
    const prevUrl = `/dashboard/report?week=${formatWeekParam(addWeeks(weekStart, -1))}`;
    const nextUrl = `/dashboard/report?week=${formatWeekParam(addWeeks(weekStart, 1))}`;
    const currentUrl = `/dashboard/report`;

    return (
        <div className="min-w-0 space-y-3 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:space-y-0 lg:gap-3">
            <PageHeader
                icon={<CalendarRange className="h-5 w-5" />}
                iconClass="bg-primary/15 text-primary"
                title="周报复盘"
                description={
                    <span className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-foreground">
                            {format(weekStart, "yyyy年第")}{weekNumber}周
                        </span>
                        <span className="text-border">•</span>
                        <span className="font-mono text-muted-foreground">
                            {format(weekStart, "MM.dd")} ~ {format(new Date(weekEndMs), "MM.dd")}
                        </span>
                        {broadcaster.uname && (
                            <>
                                <span className="text-border">•</span>
                                <span className="text-muted-foreground">主播: {broadcaster.uname}</span>
                            </>
                        )}
                    </span>
                }
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
                            <Link
                                href={prevUrl}
                                title="上一周"
                                className="flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                                <span>上一周</span>
                            </Link>
                            <span className="h-4 w-px bg-border my-auto" />
                            {isCurrentWeek ? (
                                <span
                                    title="已是最新一周"
                                    className="flex h-8 items-center gap-1 px-2.5 text-xs font-semibold text-muted-foreground/40 cursor-not-allowed"
                                >
                                    <span>下一周</span>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </span>
                            ) : (
                                <Link
                                    href={nextUrl}
                                    title="下一周"
                                    className="flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
                                >
                                    <span>下一周</span>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Link>
                            )}
                        </div>

                        {!isCurrentWeek && (
                            <Link
                                href={currentUrl}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
                            >
                                <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>回到本周</span>
                            </Link>
                        )}
                    </div>
                }
            />

            <ReportDetails
                overview={{
                    sessionCount: stats.sessionCount,
                    prevSessionCount: report.prevSessionCount,
                    durationMin: stats.durationMin,
                    danmakuCount: stats.danmakuCount,
                    prevDanmakuCount: prevStats?.danmakuCount,
                    totalIncome: stats.totalIncome,
                    prevTotalIncome: prevStats?.totalIncome,
                    giftIncome: stats.giftIncome,
                    prevGiftIncome: prevStats?.giftIncome,
                    guardIncome: stats.guardIncome,
                    prevGuardIncome: prevStats?.guardIncome,
                    scIncome: stats.scIncome,
                    prevScIncome: prevStats?.scIncome,
                    daily: report.daily,
                }}
                topGifts={report.topGifts.map((g) => ({
                    uname: g.uname,
                    uface: g.uface,
                    total: g.total,
                }))}
                sessions={report.sessions.map((s) => ({
                    id: s.id,
                    startTs: s.startTs,
                    endTs: s.endTs,
                    duration: s.duration,
                    title: s.title,
                    totalIncome: s.totalIncome,
                }))}
                highlights={report.highlights.map((t) => ({
                    id: t.id,
                    type: t.type,
                    uname: t.uname,
                    uface: t.uface,
                    content: t.content,
                    price: t.price,
                    ts: t.ts,
                }))}
            />
        </div>
    );
}
