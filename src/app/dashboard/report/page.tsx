import Link from "next/link";
import { addWeeks, format, startOfWeek } from "date-fns";
import { CalendarRange } from "lucide-react";

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

    const weekParam = Array.isArray(params?.week) ? params.week[0] : params?.week;
    const weekStart = startOfWeek(parseDateParam(weekParam) ?? new Date(), { weekStartsOn: 1 });
    const weekStartMs = weekStart.getTime();
    const weekEndMs = weekStartMs + WEEK_MS - 1;

    if (!broadcaster || !broadcaster.room_id) {
        return <div className="p-8">未找到主播信息</div>;
    }

    const report = await getWeeklyReport(broadcaster.room_id, weekStartMs);
    const { stats, prevStats } = report;
    const prevUrl = `/dashboard/report?week=${formatWeekParam(addWeeks(weekStart, -1))}`;
    const currentUrl = `/dashboard/report`;

    return (
        <div className="min-w-0 space-y-6">
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
