import { BarChart2 } from "lucide-react";

import { AnalyticsDateFilter } from "@/components/dashboard/AnalyticsDateFilter";
import { RankingLimitControl } from "@/components/dashboard/RankingLimitControl";
import { StatsCharts } from "@/components/dashboard/StatsCharts";
import { PageHeader } from "@/components/shared/PageHeader";
import { requireAuth } from "@/lib/auth";
import { getBroadcasterByUid, getTopDanmakuUsers, getTopGiftUsers } from "@/lib/data";
import { getFirstParam, resolveDateRangeParams } from "@/lib/date-params";

export const dynamic = "force-dynamic";

type RankingPageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function parseLimit(value: string | undefined) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 20;
    return Math.min(Math.max(Math.floor(parsed), 1), 100);
}

export default async function RankingPage({ searchParams }: RankingPageProps) {
    const uid = await requireAuth();
    const broadcaster = await getBroadcasterByUid(uid);
    const params = await searchParams;
    const { from, to, startTime, endTime } = resolveDateRangeParams(params);
    const limit = parseLimit(getFirstParam(params?.limit));

    if (!broadcaster?.room_id) {
        return <div className="p-8">未找到主播信息</div>;
    }

    const [topDanmaku, topGifts] = await Promise.all([
        getTopDanmakuUsers(broadcaster.room_id, startTime, endTime, limit),
        getTopGiftUsers(broadcaster.room_id, startTime, endTime, limit),
    ]);

    return (
        <div className="min-w-0 space-y-4 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:space-y-0 lg:gap-4 lg:overflow-hidden">
            <PageHeader
                icon={<BarChart2 className="h-5 w-5" />}
                iconClass="bg-violet-500/15 text-violet-300"
                title="数据排行"
                description="查看弹幕榜和礼物榜的用户排行。"
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <RankingLimitControl value={limit} />
                        <AnalyticsDateFilter from={from} to={to} />
                    </div>
                }
            />

            <StatsCharts
                danmakuTop={topDanmaku}
                giftTop={topGifts}
                className="min-h-[520px] lg:min-h-0 lg:flex-1"
            />
        </div>
    );
}
