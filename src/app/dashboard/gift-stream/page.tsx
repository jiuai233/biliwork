'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { endOfDay, startOfDay } from 'date-fns';
import {
    Box,
    CheckCircle2,
    CircleDollarSign,
    Download,
    Gift,
    Loader2,
    QrCode,
    Receipt,
    RefreshCw,
    Search,
    Shapes,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Table } from '@heroui/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { BiliQrPanel } from '@/components/bilibili/BiliQrPanel';
import { AnalyticsDateRangePicker, type DateRange } from '@/components/dashboard/AnalyticsDateRangePicker';
import { EmptyState } from '@/components/shared/EmptyState';
import { ListPager } from '@/components/shared/ListPager';
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
    if (status === 'done') return '已同步';
    if (status === 'error') return '同步失败';
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
    const [searchQuery, setSearchQuery] = useState('');

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
        } catch (error) {
            console.error(error);
            if (showError) toast.error('无法加载礼物流水，请刷新后重试');
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

    // Filter items locally by search query if any
    const filteredItems = useMemo(() => {
        if (!data?.items) return [];
        if (!searchQuery.trim()) return data.items;
        const query = searchQuery.trim().toLowerCase();
        return data.items.filter((item) => {
            const uname = (item.uname ?? '').toLowerCase();
            const uid = String(item.uid);
            const giftName = item.name.toLowerCase();
            return uname.includes(query) || uid.includes(query) || giftName.includes(query);
        });
    }, [data?.items, searchQuery]);

    // Export CSV
    const exportCsv = useCallback(() => {
        if (!data?.items || data.items.length === 0) {
            toast.error('当前列表没有可导出的数据');
            return;
        }
        const headers = ['时间', '用户UID', '用户昵称', '礼物名称', '数量', '金仓鼠', '折合收益(元)'];
        const rows = data.items.map((item) => [
            item.time,
            item.uid,
            `"${(item.uname ?? '').replace(/"/g, '""')}"`,
            `"${item.name.replace(/"/g, '""')}"`,
            item.num,
            item.hamster,
            (item.hamster / 500).toFixed(2),
        ]);
        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `bili-gift-stream-${formatYmd(new Date().toISOString().slice(0, 10).replace(/-/g, ''))}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('已导出当前页流水数据 CSV');
    }, [data?.items]);

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

    const { status, total, totalPages, blindbox } = data;
    const distribution = blindbox.distribution.filter((item) => item.count > 0);

    return (
        <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col space-y-4 lg:space-y-0 lg:gap-4 overflow-y-auto lg:overflow-hidden">
            {/* Header with Title, Status & Actions */}
            <PageHeader
                icon={<Gift className="h-5 w-5" />}
                iconClass="bg-amber-500/15 text-amber-500"
                title="礼物流水"
                description={
                    <span className="flex flex-wrap items-center gap-2 text-xs">
                        <span>创作者中心官方收礼记录</span>
                        <span className="text-border">•</span>
                        <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
                            {status.bound ? (
                                <>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                    <span>已绑定 UID {status.boundUid}</span>
                                </>
                            ) : (
                                <span>未绑定 B 站账号</span>
                            )}
                        </span>
                        {status.syncStatus === 'done' && (
                            <>
                                <span className="text-border">•</span>
                                <span className="text-emerald-500">已同步至昨日</span>
                            </>
                        )}
                    </span>
                }
                actions={
                    <div className="flex flex-wrap items-center gap-2">
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
                            className="h-9 rounded-lg gap-1.5"
                            onClick={() => setShowQr(true)}
                        >
                            <QrCode className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{status.bound ? '重新绑定' : '扫码绑定'}</span>
                        </Button>
                        <Button
                            type="button"
                            className="h-9 rounded-lg gap-1.5"
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
                            <span>
                                {status.syncStatus === 'queued'
                                    ? '排队中'
                                    : status.syncStatus === 'running'
                                        ? '同步中'
                                        : '同步流水'}
                            </span>
                        </Button>
                    </div>
                }
            />

            {/* Bind QR Dialog */}
            <Dialog open={showQr} onOpenChange={setShowQr}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>扫码绑定 B 站账号</DialogTitle>
                        <DialogDescription>
                            请使用哔哩哔哩 App 扫码。确认登录时建议选择「在公共环境登录，如网吧等」。
                        </DialogDescription>
                    </DialogHeader>
                    {showQr && (
                        <BiliQrPanel
                            autoStart
                            generate={generateQr}
                            poll={pollQr}
                            onSuccess={() => {
                                toast.success('绑定成功，已开始同步礼物流水');
                                setShowQr(false);
                                void load(false, 1, pageSize);
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Metric Summary Cards Grid (4 Cards) */}
            <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                    label="税前预计收益 (折合)"
                    icon={<CircleDollarSign className="h-4 w-4 text-amber-500" />}
                    value={formatCurrency(status.hamsterTotal / 500)}
                    sub={`${status.hamsterTotal.toLocaleString('zh-CN')} 金仓鼠`}
                    tone="amber"
                />
                <StatCard
                    label="礼物流水总记录"
                    icon={<Receipt className="h-4 w-4 text-sky-500" />}
                    value={`${total.toLocaleString('zh-CN')} 条`}
                    sub={`折合 ${status.batteryTotal.toLocaleString('zh-CN')} 电池`}
                    tone="sky"
                />
                <StatCard
                    label="心动盲盒净盈亏"
                    icon={<Box className="h-4 w-4 text-emerald-500" />}
                    value={`${blindbox.netProfit >= 0 ? '+' : ''}${formatCurrency(blindbox.netProfit / 10)}`}
                    sub={`${blindbox.profitRate.toFixed(1)}% 盈利率 (开盒 ${blindbox.totalBoxes.toLocaleString('zh-CN')} 次)`}
                    tone={blindbox.netProfit >= 0 ? 'emerald' : 'orange'}
                    delta={
                        blindbox.netProfit >= 0
                            ? <TrendingUp className="h-3.5 w-3.5 text-profit" />
                            : <TrendingDown className="h-3.5 w-3.5 text-loss" />
                    }
                />
                <StatCard
                    label="收到礼物种类"
                    icon={<Shapes className="h-4 w-4 text-purple-500" />}
                    value={`${status.uniqueCount.toLocaleString('zh-CN')} 种`}
                    sub={syncLabel(status.syncStatus)}
                    tone="purple"
                />
            </div>

            {status.syncError && (
                <div className="shrink-0 rounded-lg bg-loss/10 border border-loss/20 p-3 text-xs text-loss">
                    同步错误: {status.syncError}
                </div>
            )}

            {/* Main Tabs Panel */}
            <Tabs
                selectedKey={tab}
                onSelectionChange={(key) => setTab(String(key))}
                className="flex min-h-0 flex-1 flex-col gap-3"
            >
                <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <TabList aria-label="礼物流水视图">
                        <Tab id="stream">
                            <Gift className="h-3.5 w-3.5" />
                            全部流水 ({total.toLocaleString('zh-CN')})
                        </Tab>
                        <Tab id="blindbox">
                            <Box className="h-3.5 w-3.5" />
                            心动盲盒分析 ({blindbox.totalBoxes.toLocaleString('zh-CN')})
                        </Tab>
                    </TabList>

                    {tab === 'stream' && (
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    aria-label="搜索用户或礼物"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="当前页搜索用户 / 礼物..."
                                    className="h-8 w-44 sm:w-56 pl-8 text-base sm:text-sm"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 rounded-lg text-xs"
                                onClick={exportCsv}
                            >
                                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="hidden sm:inline">导出 CSV</span>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Tab 1: Stream Table */}
                <TabPanel id="stream" className="flex min-h-0 flex-1 flex-col outline-none">
                    <SectionCard
                        accent="bg-money"
                        className="flex min-h-0 flex-1 flex-col"
                        bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
                    >
                        {filteredItems.length === 0 ? (
                            <div className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center">
                                <EmptyState
                                    icon={<Gift className="h-6 w-6" />}
                                    title={status.bound ? (searchQuery ? '没有找到匹配的记录' : '当前区间暂无礼物流水') : '请扫码绑定 B 站账号'}
                                    description={status.bound
                                        ? (searchQuery
                                            ? '请尝试更换搜索关键字。'
                                            : status.syncStatus === 'queued'
                                                ? '已加入采集队列，空闲后开始拉取。'
                                                : status.syncStatus === 'running'
                                                    ? '正在按月翻页拉取中，请稍候...'
                                                    : '点右上角「同步流水」拉取今年 1 月 1 日到昨天的数据。')
                                        : '扫码后即可同步礼物明细。'}
                                />
                                {!status.bound && (
                                    <Button type="button" className="mt-3 h-9 rounded-lg" onClick={() => setShowQr(true)}>
                                        立即扫码绑定
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="dark-scrollbar min-h-0 flex-1 overflow-auto">
                                    <Table variant="secondary" className="w-full">
                                        <Table.ScrollContainer className="w-full">
                                            <Table.Content aria-label="礼物流水明细" className={`${tableChrome} min-w-[700px]`}>
                                                <Table.Header>
                                                    <Table.Column id="time" className="w-[180px] pl-5">收礼时间</Table.Column>
                                                    <Table.Column id="user" className="w-[28%]">送礼用户</Table.Column>
                                                    <Table.Column id="gift" className="w-[26%]">礼物名称</Table.Column>
                                                    <Table.Column id="num" className="w-[90px] text-right">数量</Table.Column>
                                                    <Table.Column id="hamster" className="w-[120px] text-right">金仓鼠</Table.Column>
                                                    <Table.Column id="money" className="w-[130px] pr-5 text-right">折合税前收益</Table.Column>
                                                </Table.Header>
                                                <Table.Body>
                                                    {filteredItems.map((item) => (
                                                        <Table.Row key={item.id} id={item.id} className="hover:bg-accent/40 transition-colors">
                                                            <Table.Cell className="pl-5 font-mono text-xs text-muted-foreground">
                                                                {item.time}
                                                            </Table.Cell>
                                                            <Table.Cell className="truncate text-xs">
                                                                <div className="flex items-center gap-2 truncate">
                                                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                                                        {(item.uname || String(item.uid)).slice(0, 1)}
                                                                    </div>
                                                                    <div className="truncate">
                                                                        <div className="font-semibold text-foreground truncate" title={item.uname || String(item.uid)}>
                                                                            {item.uname || item.uid}
                                                                        </div>
                                                                        <div className="font-mono text-[10px] text-muted-foreground">
                                                                            UID: {item.uid}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </Table.Cell>
                                                            <Table.Cell className="text-xs">
                                                                <span className="font-medium text-foreground">{item.name}</span>
                                                            </Table.Cell>
                                                            <Table.Cell className="text-right font-mono font-semibold text-xs text-foreground">
                                                                {item.num}
                                                            </Table.Cell>
                                                            <Table.Cell className="text-right font-mono text-xs text-muted-foreground">
                                                                {item.hamster.toLocaleString('zh-CN')}
                                                            </Table.Cell>
                                                            <Table.Cell className="pr-5 text-right font-mono font-bold text-xs text-money">
                                                                {formatCurrency(item.hamster / 500)}
                                                            </Table.Cell>
                                                        </Table.Row>
                                                    ))}
                                                </Table.Body>
                                            </Table.Content>
                                        </Table.ScrollContainer>
                                    </Table>
                                </div>
                                <ListPager
                                    total={total}
                                    page={page}
                                    pageCount={totalPages}
                                    pageSize={pageSize}
                                    pageSizeOptions={PAGE_SIZES}
                                    onPageChange={(next) => {
                                        setPage(next);
                                        void load(false, next, pageSize);
                                    }}
                                    onPageSizeChange={(size) => {
                                        const nextSize = size as (typeof PAGE_SIZES)[number];
                                        setPageSize(nextSize);
                                        setPage(1);
                                        void load(false, 1, nextSize);
                                    }}
                                />
                            </>
                        )}
                    </SectionCard>
                </TabPanel>

                {/* Tab 2: Blindbox Analytics */}
                <TabPanel id="blindbox" className="flex min-h-0 flex-1 flex-col outline-none">
                    <SectionCard
                        accent="bg-orange-500"
                        className="flex min-h-0 flex-1 flex-col"
                        bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
                    >
                        {/* Top Balance Bar */}
                        <div className="border-b border-border bg-card/60 p-4 shrink-0 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Box className="h-4 w-4 text-orange-500" />
                                        <span>心动盲盒收益分布 (按 {BLINDBOX_COST} 电池/盒反推)</span>
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        总投入 {blindbox.totalCost.toLocaleString('zh-CN')} 电池 ({blindbox.totalBoxes.toLocaleString('zh-CN')} 盒) · 礼物总产出 {blindbox.totalOutput.toLocaleString('zh-CN')} 电池
                                    </p>
                                </div>
                                <div className="text-right font-mono">
                                    <span className="text-xs text-muted-foreground">净盈亏收益</span>
                                    <span className={`text-base font-bold ml-2 ${blindbox.netProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
                                        {blindbox.netProfit >= 0 ? '+' : ''}{formatCurrency(blindbox.netProfit / 10)} ({blindbox.profitRate.toFixed(1)}%)
                                    </span>
                                </div>
                            </div>

                            {/* Ratio Bar */}
                            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden flex">
                                <div
                                    className="h-full bg-emerald-500 transition-all"
                                    style={{ width: `${Math.min(100, Math.max(0, blindbox.totalCost > 0 ? (blindbox.totalOutput / (blindbox.totalCost + blindbox.totalOutput)) * 100 : 50))}%` }}
                                    title="产出价值占比"
                                />
                                <div
                                    className="h-full bg-orange-400 transition-all"
                                    style={{ width: `${Math.max(0, 100 - Math.min(100, Math.max(0, blindbox.totalCost > 0 ? (blindbox.totalOutput / (blindbox.totalCost + blindbox.totalOutput)) * 100 : 50)))}%` }}
                                    title="投入成本占比"
                                />
                            </div>
                        </div>

                        {distribution.length === 0 ? (
                            <div className="p-8">
                                <EmptyState title="所选区间没有盲盒产出记录" />
                            </div>
                        ) : (
                            <div className="dark-scrollbar min-h-0 flex-1 overflow-auto">
                                <Table variant="secondary" className="w-full">
                                    <Table.ScrollContainer className="w-full">
                                        <Table.Content aria-label="盲盒产出分布" className={`${tableChrome} min-w-[560px]`}>
                                            <Table.Header>
                                                <Table.Column id="name" isRowHeader className="w-[35%] pl-5">盲盒产出礼物</Table.Column>
                                                <Table.Column id="count" className="w-[20%] text-right">产出次数</Table.Column>
                                                <Table.Column id="price" className="w-[20%] text-right">单价 (电池)</Table.Column>
                                                <Table.Column id="output" className="w-[25%] pr-5 text-right">总产出价值 (折合)</Table.Column>
                                            </Table.Header>
                                            <Table.Body>
                                                {distribution.map((item) => {
                                                    const isProfit = item.value >= BLINDBOX_COST;
                                                    return (
                                                        <Table.Row key={item.name} id={item.name} className="hover:bg-accent/40 transition-colors">
                                                            <Table.Cell className="pl-5 text-xs font-semibold text-foreground">
                                                                <div className="flex items-center gap-2">
                                                                    <span>{item.name}</span>
                                                                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${isProfit ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-muted text-muted-foreground'}`}>
                                                                        {isProfit ? '超额大奖' : '保底垫刀'}
                                                                    </span>
                                                                </div>
                                                            </Table.Cell>
                                                            <Table.Cell className="text-right font-mono text-xs text-foreground">
                                                                {item.count.toLocaleString('zh-CN')}
                                                            </Table.Cell>
                                                            <Table.Cell className="text-right font-mono text-xs text-muted-foreground">
                                                                {item.value.toLocaleString('zh-CN')}
                                                            </Table.Cell>
                                                            <Table.Cell className="pr-5 text-right font-mono font-bold text-xs text-money">
                                                                {formatCurrency(item.totalValue / 10)}
                                                            </Table.Cell>
                                                        </Table.Row>
                                                    );
                                                })}
                                            </Table.Body>
                                        </Table.Content>
                                    </Table.ScrollContainer>
                                </Table>
                            </div>
                        )}
                    </SectionCard>
                </TabPanel>
            </Tabs>
        </div>
    );
}
