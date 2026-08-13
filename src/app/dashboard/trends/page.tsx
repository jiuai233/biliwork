import { TrendingUp } from "lucide-react";

import { requireAuth } from "@/lib/auth";
import { getBroadcasterByUid } from "@/lib/data";
import { endOfLocalDay, formatDateParam, parseDateParam, resolveDateRangeParams, startOfLocalDay } from "@/lib/date-params";
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

/** 无日期参数时默认近 7 天（趋势页按单日展示意义有限）。 */
function resolveTrendRange(params: Record<string, string | string[] | undefined> | undefined) {
    if (params?.from || params?.to) {
        return resolveDateRangeParams(params);
    }
    const now = new Date();
    const fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    return {
        from: formatDateParam(fromDate),
        to: formatDateParam(now),
        startTime: startOfLocalDay(fromDate).getTime(),
        endTime: endOfLocalDay(now).getTime(),
    };
}

export default async function TrendsPage({ searchParams }: TrendsPageProps) {
    const uid = await requireAuth();
    const broadcaster = await getBroadcasterByUid(uid);
    const params = await searchParams;
    const { from, to, startTime, endTime } = resolveTrendRange(params);

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
