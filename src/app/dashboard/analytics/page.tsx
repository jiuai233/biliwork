
import { requireAuth } from "@/lib/auth";
import { getBroadcasterByUid, getUnifiedTransactions } from "@/lib/data";
import { AnalyticsTable } from "@/components/dashboard/AnalyticsTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
    const uid = await requireAuth();
    const broadcaster = await getBroadcasterByUid(uid);

    if (!broadcaster || !broadcaster.room_id) {
        return <div className="p-8">未找到主播信息</div>;
    }

    const transactions = await getUnifiedTransactions(broadcaster.room_id, 200);

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
                    <CardTitle className="text-zinc-100">营收记录明细</CardTitle>
                    <CardDescription>
                        合并展示所有类型的付费互动记录 (最近200条)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AnalyticsTable data={transactions} />
                </CardContent>
            </Card>
        </div>
    );
}
