
import { requireAuth } from "@/lib/auth";
import { getBroadcasterByUid, getUnifiedTransactions } from "@/lib/data";
import { AnalyticsDateFilter } from "@/components/dashboard/AnalyticsDateFilter";
import { AnalyticsTable } from "@/components/dashboard/AnalyticsTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = 'force-dynamic';

type AnalyticsPageProps = {
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

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
}

function startOfLocalDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function formatDisplayDate(value: string) {
    const date = parseDateParam(value);
    return date ? date.toLocaleDateString("zh-CN") : value;
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
    const uid = await requireAuth();
    const broadcaster = await getBroadcasterByUid(uid);
    const params = await searchParams;
    const today = new Date();
    const fromParam = getFirstParam(params?.from);
    const toParam = getFirstParam(params?.to);
    const fromDate = parseDateParam(fromParam) ?? today;
    const toDate = parseDateParam(toParam) ?? fromDate;
    const normalizedFrom = fromDate.getTime() <= toDate.getTime() ? fromDate : toDate;
    const normalizedTo = fromDate.getTime() <= toDate.getTime() ? toDate : fromDate;
    const from = formatDateParam(normalizedFrom);
    const to = formatDateParam(normalizedTo);
    const startTime = startOfLocalDay(normalizedFrom).getTime();
    const endTime = endOfLocalDay(normalizedTo).getTime();

    if (!broadcaster || !broadcaster.room_id) {
        return <div className="p-8">未找到主播信息</div>;
    }

    const transactions = await getUnifiedTransactions(broadcaster.room_id, {
        startTime,
        endTime,
    });

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-white">数据分析</h2>
                <p className="text-muted-foreground">
                    查看详细的礼物、舰长和醒目留言记录。
                </p>
            </div>

            <Card className="border-zinc-800 bg-zinc-900/50">
                <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <CardTitle className="text-zinc-100">营收记录明细</CardTitle>
                            <CardDescription>
                                展示 {formatDisplayDate(from)} 至 {formatDisplayDate(to)} 的全部付费互动记录，共 {transactions.length} 条
                            </CardDescription>
                        </div>
                        <AnalyticsDateFilter from={from} to={to} />
                    </div>
                </CardHeader>
                <CardContent>
                    <AnalyticsTable data={transactions} />
                </CardContent>
            </Card>
        </div>
    );
}
