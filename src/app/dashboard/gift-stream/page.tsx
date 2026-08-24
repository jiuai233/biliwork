'use client';

import { useCallback, useEffect, useState } from 'react';
import { Gift, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { BiliQrPanel } from '@/components/bilibili/BiliQrPanel';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { PageHeader } from '@/components/shared/PageHeader';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatCard } from '@/components/shared/StatCard';
import { tableChrome } from '@/components/shared/table';
import { formatCurrency } from '@/lib/format';
import {
    generateBindQrAction,
    getGiftStreamData,
    pollBindQrAction,
    startGiftStreamSyncAction,
} from './actions';

type GiftStreamData = Awaited<ReturnType<typeof getGiftStreamData>>;

function formatYmd(value: string | null): string {
    if (!value || value.length !== 8) return '-';
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function syncLabel(status: string): string {
    if (status === 'queued') return '排队中';
    if (status === 'running') return '同步中';
    if (status === 'done') return '已完成';
    if (status === 'error') return '失败';
    return '未同步';
}

function isSyncing(status: string): boolean {
    return status === 'queued' || status === 'running';
}

export default function GiftStreamPage() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [data, setData] = useState<GiftStreamData | null>(null);

    const load = useCallback(async (showError = false) => {
        try {
            const result = await getGiftStreamData();
            setData(result);
        } catch (error) {
            console.error(error);
            if (showError) toast.error('获取礼物流水失败');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void load(true);
    }, [load]);

    useEffect(() => {
        if (!isSyncing(data?.status.syncStatus ?? '')) return;
        const timer = setInterval(() => {
            void load();
        }, 3000);
        return () => clearInterval(timer);
    }, [data?.status.syncStatus, load]);

    const generateQr = useCallback(() => generateBindQrAction(), []);
    const pollQr = useCallback((qrcodeKey: string) => pollBindQrAction(qrcodeKey), []);

    if (loading) {
        return <LoadingScreen />;
    }

    if (!data) {
        return (
            <EmptyState
                icon={<Gift className="h-6 w-6" />}
                title="礼物流水暂不可用"
                description="请确认已执行 prisma/add_gift_stream.sql，然后刷新页面。"
            />
        );
    }

    const { status, items } = data;

    return (
        <div className="min-w-0 space-y-4 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:space-y-0 lg:gap-4 lg:overflow-hidden">
            <PageHeader
                icon={<Gift className="h-5 w-5" />}
                iconClass="bg-primary/15 text-primary"
                title="礼物流水"
                description="扫码后由采集端排队拉取今年 1 月 1 日到昨天的收礼记录。没有身份码也能看。"
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-9 rounded-lg"
                            onClick={() => setShowQr((value) => !value)}
                        >
                            {status.bound ? '重新扫码绑定' : '扫码绑定 B 站'}
                        </Button>
                        <Button
                            type="button"
                            className="h-9 rounded-lg"
                            disabled={!status.bound || isSyncing(status.syncStatus) || refreshing}
                            onClick={async () => {
                                setRefreshing(true);
                                try {
                                    const result = await startGiftStreamSyncAction();
                                    if (!result.ok) toast.error(result.message);
                                    else toast.success(result.message);
                                    await load();
                                } catch {
                                    toast.error('同步请求失败，请稍后重试');
                                } finally {
                                    setRefreshing(false);
                                }
                            }}
                        >
                            {isSyncing(status.syncStatus) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                            {status.syncStatus === 'queued'
                                ? '排队中'
                                : status.syncStatus === 'running'
                                    ? '同步中'
                                    : '同步流水'}
                        </Button>
                    </div>
                }
            />

            {showQr && (
                <SectionCard title="扫码绑定" accent="bg-primary" bodyClassName="px-4 py-4">
                    <BiliQrPanel
                        generate={generateQr}
                        poll={pollQr}
                        onSuccess={() => {
                            toast.success('绑定成功，开始同步礼物流水');
                            setShowQr(false);
                            void load();
                        }}
                    />
                </SectionCard>
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                    label="绑定状态"
                    value={status.bound ? '已绑定' : '未绑定'}
                    sub={status.boundUid ? `UID ${status.boundUid}` : '扫码后加密保存 Cookie'}
                    tone={status.bound ? 'emerald' : 'neutral'}
                />
                <StatCard
                    label="同步"
                    value={syncLabel(status.syncStatus)}
                    sub={
                        status.syncStatus === 'queued'
                            ? (status.queueAhead > 0
                                ? `前面还有 ${status.queueAhead} 个任务，采集端一次只跑一个`
                                : '采集端空闲后开始拉取，请保持页面打开')
                            : status.syncStatus === 'running' && status.syncCursor
                                ? `已拉到 ${formatYmd(status.syncCursor)}`
                            : status.syncFrom && status.syncTo
                                ? `${formatYmd(status.syncFrom)} ~ ${formatYmd(status.syncTo)}`
                                : '接口只保留近 180 天'
                    }
                    tone={status.syncStatus === 'error' ? 'orange' : status.syncStatus === 'done' ? 'emerald' : isSyncing(status.syncStatus) ? 'purple' : 'neutral'}
                />
                <StatCard
                    label="唯一礼物"
                    value={status.uniqueCount.toLocaleString('zh-CN')}
                    sub={`毛数 ${status.rawCount.toLocaleString('zh-CN')}（含跨页重复）`}
                    tone="sky"
                />
                <StatCard
                    label="税前收益"
                    value={formatCurrency(status.hamsterTotal / 500)}
                    sub={`${status.batteryTotal.toLocaleString('zh-CN')} 电池`}
                    tone="amber"
                />
            </div>

            {status.syncError && (
                <p className="text-sm text-loss">{status.syncError}</p>
            )}

            <SectionCard
                title="最近 200 条"
                accent="bg-money"
                className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
                bodyClassName="lg:min-h-0 lg:flex-1 lg:overflow-auto"
            >
                {items.length === 0 ? (
                    <EmptyState
                        icon={<Gift className="h-6 w-6" />}
                        title={status.bound ? '还没有礼物流水' : '请先扫码绑定'}
                        description={status.bound
                            ? (status.syncStatus === 'queued'
                                ? '已加入采集队列。采集端一次只拉一个主播，排队时按钮会停用，不是卡住。'
                                : status.syncStatus === 'running'
                                    ? '正在按月翻页拉取，通常需要几分钟。'
                                    : status.syncStatus === 'done' && status.uniqueCount === 0
                                        ? '同步完成，但创作者中心礼物流水是空的。可重新扫码后再同步。'
                                        : '点「同步流水」拉取今年 1 月 1 日到昨天的数据。更早于 180 天的月份接口会返回空。')
                            : '扫码时选择「在公共环境登录，如网吧等」。'}
                    />
                ) : (
                    <table className={tableChrome}>
                        <thead>
                            <tr>
                                <th>时间</th>
                                <th>用户</th>
                                <th>礼物</th>
                                <th className="text-right">数量</th>
                                <th className="text-right">金仓鼠</th>
                                <th className="text-right">金额</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.id}>
                                    <td className="tabular-nums text-sm">{item.time.slice(5)}</td>
                                    <td className="truncate text-sm">{item.uname || item.uid}</td>
                                    <td className="text-sm">{item.name}</td>
                                    <td className="text-right tabular-nums text-sm">{item.num}</td>
                                    <td className="text-right tabular-nums text-sm">{item.hamster}</td>
                                    <td className="text-right tabular-nums text-sm text-money">
                                        {formatCurrency(item.hamster / 500)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </SectionCard>
        </div>
    );
}
