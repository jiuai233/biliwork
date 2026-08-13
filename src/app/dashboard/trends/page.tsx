import { TrendingUp } from "lucide-react";

import { requireAuth } from "@/lib/auth";
import { getBroadcasterByUid } from "@/lib/data";
import { parseDateParam, resolveDateRangeParams } from "@/lib/date-params";
import { getTrend } from "@/lib/services/analytics";
import { AnalyticsDateFilter } from "@/components/dashboard/AnalyticsDateFilter";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = 'force-dynamic';

type TrendsPageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function formatDisplayDate(value: string) {
    const date = parseDateParam(value);
    return date ? date.toLocaleDateString("zh-CN") : value;
}

export default async function TrendsPage({ searchParams }: TrendsPageProps) {
    const uid = await requireAuth();
    const broadcaster = await getBroadcasterByUid(uid);
    const params = await searchParams;
    const { from, to, startTime, endTime } = resolveDateRangeParams(params);

    if (!broadcaster || !broadcaster.room_id) {
        return <div className="p-8">未找到主播信息</div>;
    }

    const trend = await getTrend(broadcaster.room_id, startTime, endTime);

    return (
        <div className="space-y-4">
            <PageHeader
                icon={<TrendingUp className="h-5 w-5" />}
                iconClass="bg-primary/15 text-primary"
                title="数据趋势"
                description={
                    <span>
                        展示 {formatDisplayDate(from)} 至 {formatDisplayDate(to)} 的弹幕与营收趋势
                    </span>
                }
                actions={<AnalyticsDateFilter from={from} to={to} />}
            />

            <TrendChart points={trend} />
        </div>
    );
}
