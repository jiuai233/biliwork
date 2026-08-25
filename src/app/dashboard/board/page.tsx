import { requireAuth } from "@/lib/auth";
import { getBroadcasterByUid, getLiveSessionsWithIncome, getUnifiedTransactions } from "@/lib/data";
import { InteractiveBoard } from "@/components/dashboard/InteractiveBoard";
import { PageHeader } from "@/components/shared/PageHeader";
import { Clapperboard } from "lucide-react";

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
        <div className="min-w-0 space-y-3 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:space-y-0 lg:gap-3">
            <PageHeader
                icon={<Clapperboard className="h-5 w-5" />}
                iconClass="bg-pink-500/15 text-pink-500"
                title="切片 / 晒单制作板"
                description="拖拽筛选高光互动，自由编排并生成透明/高清晒单切片图或 OBS 实时推流画中画。"
            />

            <InteractiveBoard
                initialTransactions={transactions}
                initialSessions={sessions}
                overlayCode={overlayCode}
                broadcaster={{
                    uname: broadcaster.uname || '主播',
                    uface: broadcaster.uface || '',
                    roomId: broadcaster.room_id,
                }}
            />
        </div>
    );
}
