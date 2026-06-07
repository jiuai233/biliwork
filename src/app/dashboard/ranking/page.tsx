import { Card } from "@heroui/react";
import { BarChart2 } from "lucide-react";

import { AnalyticsDateFilter } from "@/components/dashboard/AnalyticsDateFilter";
import { RankingLimitControl } from "@/components/dashboard/RankingLimitControl";
import { StatsCharts } from "@/components/dashboard/StatsCharts";
import { requireAuth } from "@/lib/auth";
import { getBroadcasterByUid, getTopDanmakuUsers, getTopGiftUsers } from "@/lib/data";

export const dynamic = "force-dynamic";

type RankingPageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getFirstParam(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

function formatDateParam(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function parseDateParam(value: string | undefined) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
        ? date
        : null;
}

function startOfLocalDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function parseLimit(value: string | undefined) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 20;
    return Math.min(Math.max(Math.floor(parsed), 1), 100);
}

export default async function RankingPage({ searchParams }: RankingPageProps) {
    const uid = await requireAuth();
    const broadcaster = await getBroadcasterByUid(uid);
    const params = await searchParams;
    const today = new Date();
    const fromDate = parseDateParam(getFirstParam(params?.from)) ?? today;
    const toDate = parseDateParam(getFirstParam(params?.to)) ?? fromDate;
    const normalizedFrom = fromDate.getTime() <= toDate.getTime() ? fromDate : toDate;
    const normalizedTo = fromDate.getTime() <= toDate.getTime() ? toDate : fromDate;
    const from = formatDateParam(normalizedFrom);
    const to = formatDateParam(normalizedTo);
    const limit = parseLimit(getFirstParam(params?.limit));

    if (!broadcaster?.room_id) {
        return <div className="p-8">未找到主播信息</div>;
    }

    const startTime = startOfLocalDay(normalizedFrom).getTime();
    const endTime = endOfLocalDay(normalizedTo).getTime();
    const [topDanmaku, topGifts] = await Promise.all([
        getTopDanmakuUsers(broadcaster.room_id, startTime, endTime, limit),
        getTopGiftUsers(broadcaster.room_id, startTime, endTime, limit),
    ]);

    return (
        <div className="space-y-4">
            <Card variant="secondary" className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/55">
                <Card.Header className="border-b border-white/10 px-4 py-3">
                    <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                                <BarChart2 className="h-5 w-5" />
                            </div>
                            <div>
                                <Card.Title className="text-xl font-extrabold text-white">数据排行</Card.Title>
                                <Card.Description className="mt-0.5 text-sm text-slate-400">
                                    查看弹幕榜和礼物榜的用户排行。
                                </Card.Description>
                            </div>
                        </div>
                        <AnalyticsDateFilter from={from} to={to} />
                    </div>
                </Card.Header>
                <Card.Content className="space-y-3 p-4">
                    <RankingLimitControl value={limit} />
                    <StatsCharts
                        danmakuTop={topDanmaku}
                        giftTop={topGifts}
                        className="h-[calc(100vh-205px)] min-h-[520px]"
                    />
                </Card.Content>
            </Card>
        </div>
    );
}
