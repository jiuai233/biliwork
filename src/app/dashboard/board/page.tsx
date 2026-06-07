
import { requireAuth } from "@/lib/auth";
import { getBroadcasterByUid, getLiveSessionsWithIncome, getUnifiedTransactions } from "@/lib/data";
import { InteractiveBoard } from "@/components/dashboard/InteractiveBoard";

export const dynamic = 'force-dynamic';

export default async function BoardPage() {
    const uid = await requireAuth();
    const broadcaster = await getBroadcasterByUid(uid);

    if (!broadcaster || !broadcaster.room_id) {
        return <div className="p-8">未找到主播信息</div>;
    }

    // 短链编码: roomId → base36
    const overlayCode = broadcaster.room_id.toString(36);

    // 获取最近500条记录供选择
    const [transactions, sessions] = await Promise.all([
        getUnifiedTransactions(broadcaster.room_id, 500),
        getLiveSessionsWithIncome(broadcaster.room_id, 0, undefined, 30),
    ]);

    return (
        <div className="min-w-0 space-y-4">
            <header className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
                <h2 className="text-2xl font-bold tracking-normal text-white md:text-3xl">切片/晒单 制作板</h2>
                <p className="mt-1 text-sm text-zinc-400">
                    拖拽筛选高光时刻，自由组合并生成图片用于分享。
                </p>
            </header>

            <InteractiveBoard
                initialTransactions={transactions}
                initialSessions={sessions}
                overlayCode={overlayCode}
            />
        </div>
    );
}
