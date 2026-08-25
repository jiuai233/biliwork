import { BarChart3 } from "lucide-react";

import { requireAuth } from "@/lib/auth";
import { getBroadcasterByUid, getUnifiedTransactions } from "@/lib/data";
import { parseDateParam, resolveDateRangeParams } from "@/lib/date-params";
import { AnalyticsDateFilter } from "@/components/dashboard/AnalyticsDateFilter";
import { AnalyticsTable } from "@/components/dashboard/AnalyticsTable";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = 'force-dynamic';

type AnalyticsPageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function formatDisplayDate(value: string) {
    const date = parseDateParam(value);
    return date ? date.toLocaleDateString("zh-CN") : value;
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
    const uid = await requireAuth();
    const broadcaster = await getBroadcasterByUid(uid);
    const params = await searchParams;
    const { from, to, startTime, endTime } = resolveDateRangeParams(params);

    if (!broadcaster || !broadcaster.room_id) {
        return <div className="p-8">未找到主播信息</div>;
    }

    const transactions = await getUnifiedTransactions(broadcaster.room_id, {
        startTime,
        endTime,
    });

    return (
        <div className="min-w-0 space-y-4 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:space-y-0 lg:gap-4 lg:overflow-hidden">
            <PageHeader
                icon={<BarChart3 className="h-5 w-5" />}
                iconClass="bg-sky-500/15 text-sky-400"
                title="数据分析"
                description={
                    <span>
                        展示 {formatDisplayDate(from)} 至 {formatDisplayDate(to)} 的全部付费互动记录，共 {transactions.length} 条
                    </span>
                }
                actions={<AnalyticsDateFilter from={from} to={to} />}
            />

            <div className="min-w-0 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
                <AnalyticsTable data={transactions} />
            </div>
        </div>
    );
}
