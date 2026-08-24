'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { endOfDay, startOfDay } from 'date-fns';
import { Box, Gift, Loader2, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Table } from '@heroui/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BiliQrPanel } from '@/components/bilibili/BiliQrPanel';
import { AnalyticsDateRangePicker, type DateRange } from '@/components/dashboard/AnalyticsDateRangePicker';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { PageHeader } from '@/components/shared/PageHeader';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatCard } from '@/components/shared/StatCard';
import { Tab, TabList, TabPanel, Tabs } from '@/components/shared/tabs';
import { tableChrome } from '@/components/shared/table';
import { formatCurrency } from '@/lib/format';
import { BLINDBOX_COST } from '@/lib/types';
import {
    generateBindQrAction,
    getGiftStreamData,
    pollBindQrAction,
    startGiftStreamSyncAction,
} from './actions';

type GiftStreamData = Awaited<ReturnType<typeof getGiftStreamData>>;

const PAGE_SIZES = [20, 50, 100] as const;

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

function defaultDateRange(): DateRange {
    const now = new Date();
    return { from: new Date(now.getFullYear(), 0, 1), to: now };
}

export default function GiftStreamPage() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [tab, setTab] = useState('stream');
    const [data, setData] = useState<GiftStreamData | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(50);
    const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);
    const [jumpPage, setJumpPage] = useState('1');

    const rangeTimes = useMemo(() => {
        const from = dateRange.from ?? new Date(new Date().getFullYear(), 0, 1);
        const to = dateRange.to ?? from;
        return { startTime: startOfDay(from).getTime(), endTime: endOfDay(to).getTime() };
    }, [dateRange]);

    const load = useCallback(async (showError = false, nextPage = page, nextSize = pageSize) => {
        try {
            const result = await getGiftStreamData({
                page: nextPage,
                pageSize: nextSize,
                startTime: rangeTimes.startTime,
                endTime: rangeTimes.endTime,
            });
            setData(result);
            setPage(result.page);
            setPageSize(result.pageSize as (typeof PAGE_SIZES)[number]);
            setJumpPage(String(result.page));
        } catch (error) {
            console.error(error);
            if (showError) toast.error('获取礼物流水失败');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [page, pageSize, rangeTimes.endTime, rangeTimes.startTime]);

    useEffect(() => {
        void load(true, 1, pageSize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rangeTimes.startTime, rangeTimes.endTime]);

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
                title="礼物流水加载失败"
                description="请刷新页面重试。"
            />
        );
    }

    const { status, items, total, totalPages, blindbox } = data;
    const distribution = blindbox.distribution.filter((item) => item.count > 0);

    return (
        <div className="min-w-0 space-y-4 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:space-y-0 lg:gap-4 lg:overflow-hidden">
            <PageHeader
                icon={<Gift className="h-5 w-5" />}
                iconClass="bg-primary/15 text-primary"
                title="礼物流水"
                description="创作者中心收礼记录"
                actions={
                    <div className="flex flex-wrap gap-2">
                        <AnalyticsDateRangePicker
                            date={dateRange}
                            setDate={(next) => {
                                setDateRange(next ?? defaultDateRange());
                                setPage(1);
                            }}
                        />
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
                            void load(false, 1, pageSize);
                        }}
                    />
                </SectionCard>
            )}

            <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
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
                                ? `前面还有 ${status.queueAhead} 个任务`
                                : '空闲后开始拉取')
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
                <p className="shrink-0 text-sm text-loss">{status.syncError}</p>
            )}

            <Tabs
                selectedKey={tab}
                onSelectionChange={(key) => setTab(String(key))}
                className="flex min-h-0 flex-1 flex-col gap-3"
            >
                <TabList aria-label="礼物流水视图">
                    <Tab id="stream">
                        <Gift className="h-3.5 w-3.5" />
                        全部流水
                    </Tab>
                    <Tab id="blindbox">
                        <Box className="h-3.5 w-3.5" />
                        心动盲盒
                    </Tab>
                </TabList>

                <TabPanel id="stream" className="flex min-h-0 flex-1 flex-col outline-none">
                    <SectionCard
                        title={`全部流水 · ${total.toLocaleString('zh-CN')} 条`}
                        accent="bg-money"
                        className="flex min-h-0 flex-1 flex-col"
                        bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
                    >
                        {items.length === 0 ? (
                            <EmptyState
                                icon={<Gift className="h-6 w-6" />}
                                title={status.bound ? '还没有礼物流水' : '请先扫码绑定'}
                                description={status.bound
                                    ? (status.syncStatus === 'queued'
                                        ? '已加入采集队列，空闲后开始拉取。'
                                        : status.syncStatus === 'running'
                                            ? '正在按月翻页拉取。'
                                            : '点「同步流水」拉取今年 1 月 1 日到昨天的数据。')
                                    : '扫码时选择「在公共环境登录，如网吧等」。'}
                            />
                        ) : (
                            <>
                                <div className="dark-scrollbar min-h-0 flex-1 overflow-auto">
                                <Table variant="secondary" className="w-full">
                                    <Table.ScrollContainer className="w-full">
                                        <Table.Content aria-label="礼物流水" className={`${tableChrome} min-w-[720px]`}>
                                            <Table.Header>
                                                <Table.Column id="time" className="w-[160px]">时间</Table.Column>
                                                <Table.Column id="user" className="w-[22%]">用户</Table.Column>
                                                <Table.Column id="gift" className="w-[22%]">礼物</Table.Column>
                                                <Table.Column id="num" className="w-[88px] text-right">数量</Table.Column>
                                                <Table.Column id="hamster" className="w-[110px] text-right">金仓鼠</Table.Column>
                                                <Table.Column id="money" className="w-[110px] text-right">金额</Table.Column>
                                            </Table.Header>
                                            <Table.Body>
                                                {items.map((item) => (
                                                    <Table.Row key={item.id} id={item.id}>
                                                        <Table.Cell className="tabular-nums text-sm">{item.time.slice(5)}</Table.Cell>
                                                        <Table.Cell className="truncate text-sm">{item.uname || item.uid}</Table.Cell>
                                                        <Table.Cell className="text-sm">{item.name}</Table.Cell>
                                                        <Table.Cell className="text-right tabular-nums text-sm">{item.num}</Table.Cell>
                                                        <Table.Cell className="text-right tabular-nums text-sm">{item.hamster}</Table.Cell>
                                                        <Table.Cell className="text-right tabular-nums text-sm text-money">
                                                            {formatCurrency(item.hamster / 500)}
                                                        </Table.Cell>
                                                    </Table.Row>
                                                ))}
                                            </Table.Body>
                                        </Table.Content>
                                    </Table.ScrollContainer>
                                </Table>
                                </div>
                                <div className="relative z-10 flex shrink-0 flex-col gap-2 border-t border-border bg-card px-4 py-3 text-sm text-secondary-foreground lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span>共 {total.toLocaleString('zh-CN')} 条</span>
                                        <div className="flex items-center gap-1">
                                            <span>每页</span>
                                            <div className="flex h-8 overflow-hidden rounded-md border border-border bg-muted/40">
                                                {PAGE_SIZES.map((size) => (
                                                    <Button
                                                        key={size}
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setPageSize(size);
                                                            setPage(1);
                                                            void load(false, 1, size);
                                                        }}
                                                        className={[
                                                            'inline-flex h-8 items-center rounded-none border-r border-border px-2 text-xs last:border-r-0',
                                                            pageSize === size
                                                                ? 'bg-primary text-white'
                                                                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                                                        ].join(' ')}
                                                    >
                                                        {size}
                                                    </Button>
                                                ))}
                                            </div>
                                            <span>条</span>
                                        </div>
                                    </div>
                                    <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
                                        <span className="min-w-[90px] text-center">第 {page} / {totalPages} 页</span>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={page <= 1}
                                            onClick={() => {
                                                const next = Math.max(1, page - 1);
                                                setPage(next);
                                                void load(false, next, pageSize);
                                            }}
                                            className="h-8 rounded-md px-3"
                                        >
                                            上一页
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={page >= totalPages}
                                            onClick={() => {
                                                const next = Math.min(totalPages, page + 1);
                                                setPage(next);
                                                void load(false, next, pageSize);
                                            }}
                                            className="h-8 rounded-md px-3"
                                        >
                                            下一页
                                        </Button>
                                        <div className="flex items-center gap-2">
                                            <span>前往</span>
                                            <Input
                                                inputMode="numeric"
                                                value={jumpPage}
                                                onChange={(event) => setJumpPage(event.target.value)}
                                                onKeyDown={(event) => {
                                                    if (event.key !== 'Enter') return;
                                                    const next = Math.min(totalPages, Math.max(1, Number(jumpPage) || 1));
                                                    setPage(next);
                                                    void load(false, next, pageSize);
                                                }}
                                                className="h-8 w-16 text-center"
                                            />
                                            <span>页</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </SectionCard>
                </TabPanel>

                <TabPanel id="blindbox" className="flex min-h-0 flex-1 flex-col outline-none">
                    <SectionCard
                        title="心动盲盒"
                        accent="bg-orange-500"
                        className="flex min-h-0 flex-1 flex-col"
                        bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
                    >
                        <p className="shrink-0 px-4 pt-3 text-xs text-muted-foreground">
                            按创作者中心流水反推，成本 {BLINDBOX_COST} 电池/盒。
                        </p>
                        <div className="grid shrink-0 grid-cols-2 gap-3 px-4 py-3 lg:grid-cols-4">
                            <StatCard label="开盒次数" value={blindbox.totalBoxes.toLocaleString('zh-CN')} tone="orange" />
                            <StatCard
                                label="总投入"
                                value={formatCurrency(blindbox.totalCost / 10)}
                                sub={`${blindbox.totalCost.toLocaleString('zh-CN')} 电池`}
                                tone="amber"
                            />
                            <StatCard
                                label="总产出"
                                value={formatCurrency(blindbox.totalOutput / 10)}
                                sub={`${blindbox.totalOutput.toLocaleString('zh-CN')} 电池`}
                                tone="sky"
                            />
                            <StatCard
                                label="净盈亏"
                                value={`${blindbox.netProfit >= 0 ? '+' : ''}${formatCurrency(blindbox.netProfit / 10)}`}
                                sub={`${blindbox.profitRate.toFixed(1)}%`}
                                tone={blindbox.netProfit >= 0 ? 'emerald' : 'orange'}
                                delta={
                                    blindbox.netProfit >= 0
                                        ? <TrendingUp className="h-3.5 w-3.5 text-profit" />
                                        : <TrendingDown className="h-3.5 w-3.5 text-loss" />
                                }
                            />
                        </div>
                        {distribution.length === 0 ? (
                            <EmptyState title="所选区间没有盲盒产出" />
                        ) : (
                            <Table variant="secondary" className="flex min-h-0 flex-1 flex-col">
                                <Table.ScrollContainer className="dark-scrollbar min-h-0 flex-1 overflow-auto">
                                    <Table.Content aria-label="盲盒产出分布" className={`${tableChrome} min-w-[560px]`}>
                                        <Table.Header>
                                            <Table.Column id="name" isRowHeader className="w-[40%]">礼物</Table.Column>
                                            <Table.Column id="count" className="w-[20%] text-right">数量</Table.Column>
                                            <Table.Column id="price" className="w-[20%] text-right">单价(电池)</Table.Column>
                                            <Table.Column id="output" className="w-[20%] text-right">产出</Table.Column>
                                        </Table.Header>
                                        <Table.Body>
                                            {distribution.map((item) => (
                                                <Table.Row key={item.name} id={item.name}>
                                                    <Table.Cell className="text-sm">{item.name}</Table.Cell>
                                                    <Table.Cell className="text-right tabular-nums text-sm">{item.count.toLocaleString('zh-CN')}</Table.Cell>
                                                    <Table.Cell className="text-right tabular-nums text-sm">{item.value.toLocaleString('zh-CN')}</Table.Cell>
                                                    <Table.Cell className="text-right tabular-nums text-sm text-money">
                                                        {formatCurrency(item.totalValue / 10)}
                                                    </Table.Cell>
                                                </Table.Row>
                                            ))}
                                        </Table.Body>
                                    </Table.Content>
                                </Table.ScrollContainer>
                            </Table>
                        )}
                    </SectionCard>
                </TabPanel>
            </Tabs>
        </div>
    );
}
