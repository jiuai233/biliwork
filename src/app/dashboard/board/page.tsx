
import { requireAuth } from "@/lib/auth";
import { getBroadcasterByUid, getUnifiedTransactions } from "@/lib/data";
import { InteractiveBoard } from "@/components/dashboard/InteractiveBoard";

export const dynamic = 'force-dynamic';

export default async function BoardPage() {
    const uid = await requireAuth();
    const broadcaster = await getBroadcasterByUid(uid);

    if (!broadcaster || !broadcaster.room_id) {
        return <div className="p-8">未找到主播信息</div>;
    }

    // 获取最近500条记录供选择
    const transactions = await getUnifiedTransactions(broadcaster.room_id, 500);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-white">切片/晒单 制作板</h2>
                <p className="text-muted-foreground">
                    拖拽筛选高光时刻，自由组合并生成图片用于分享。
                </p>
            </div>

            <InteractiveBoard initialTransactions={transactions} />
        </div>
    );
}
