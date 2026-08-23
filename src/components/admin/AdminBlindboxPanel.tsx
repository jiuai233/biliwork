'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { endOfDay, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import { Avatar, Table } from '@heroui/react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Box,
    ChevronDown,
    ClipboardList,
    Coins,
    Filter,
    Gift,
    Search,
    TrendingDown,
    TrendingUp,
    Users,
} from 'lucide-react';
import { getAdminBlindboxData } from '@/app/admin/actions';
import { AnalyticsDateRangePicker, type DateRange } from '@/components/dashboard/AnalyticsDateRangePicker';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { SectionCard } from '@/components/shared/SectionCard';
import { Tab, TabList, TabPanel, Tabs } from '@/components/shared/tabs';
import { tableChrome } from '@/components/shared/table';
import { formatCurrency, formatDateTime, normalizeAvatarSrc } from '@/lib/format';
import { BLINDBOX_COST, BlindboxRecord, BlindboxStats, BlindboxStreamerSummary, GiftDistribution } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { BroadcasterWithStats } from './BroadcasterTable';

function rangeTimes(dateRange: DateRange | undefined) {
    if (!dateRange?.from) return null;
    return {
        start: startOfDay(dateRange.from).getTime(),
        end: endOfDay(dateRange.to || dateRange.from).getTime(),
    };
}

export function AdminBlindboxPanel({ broadcasters }: { broadcasters: BroadcasterWithStats[] }) {
    const roomBroadcasters = useMemo(
        () => broadcasters.filter((broadcaster): broadcaster is BroadcasterWithStats & { room_id: number } => broadcaster.room_id != null),
        [broadcasters],
    );

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<BlindboxStats | null>(null);
    const [streamers, setStreamers] = useState<BlindboxStreamerSummary[]>([]);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(),
        to: new Date(),
    });
    const [searchUsername, setSearchUsername] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [giftFilter, setGiftFilter] = useState('all');
    const overviewRequestRef = useRef(0);

    const [detailRoomId, setDetailRoomId] = useState<number | null>(null);
    const [detailStats, setDetailStats] = useState<BlindboxStats | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailGiftFilter, setDetailGiftFilter] = useState('all');
    const [listTab, setListTab] = useState('streamers');
    const detailRequestRef = useRef(0);

    const fetchOverview = useCallback(async (showError = false) => {
        const range = rangeTimes(dateRange);
        if (!range) return;
        const requestId = ++overviewRequestRef.current;
        try {
            const result = await getAdminBlindboxData(range.start, range.end, null, searchUsername || undefined);
            if (requestId === overviewRequestRef.current) {
                setStats(result.stats);
                setStreamers(result.streamers);
            }
        } catch (error) {
            console.error('Fetch Error:', error);
            if (showError && requestId === overviewRequestRef.current) toast.error('获取盲盒汇总失败');
        } finally {
            if (requestId === overviewRequestRef.current) setLoading(false);
        }
    }, [dateRange, searchUsername]);

    useEffect(() => {
        setLoading(true);
        setGiftFilter('all');
        fetchOverview(true);
    }, [fetchOverview]);

    useEffect(() => {
        if (detailRoomId == null) {
            setDetailStats(null);
            setDetailLoading(false);
            return;
        }

        const range = rangeTimes(dateRange);
        if (!range) return;
        const requestId = ++detailRequestRef.current;
        setDetailLoading(true);
        setDetailGiftFilter('all');

        getAdminBlindboxData(range.start, range.end, detailRoomId)
            .then((result) => {
                if (requestId === detailRequestRef.current) setDetailStats(result.stats);
            })
            .catch((error) => {
                console.error('Fetch Error:', error);
                if (requestId === detailRequestRef.current) toast.error('获取主播盲盒详情失败');
            })
            .finally(() => {
                if (requestId === detailRequestRef.current) setDetailLoading(false);
            });
    }, [dateRange, detailRoomId]);

    const isProfit = (stats?.netProfit ?? 0) >= 0;
    const records = useMemo(() => stats?.records ?? [], [stats]);
    const giftOptions = useMemo(
        () => stats?.distribution.filter((item) => item.count > 0).map((item) => item.name) ?? [],
        [stats],
    );
    const filteredRecords = useMemo(() => {
        if (giftFilter === 'all') return records;
        return records.filter((record) => record.gift_name === giftFilter);
    }, [giftFilter, records]);
    const streamerByRoom = useMemo(() => {
        const map = new Map<number, { uname: string | null; uface: string | null }>();
        for (const streamer of streamers) {
            map.set(streamer.roomId, streamer);
        }
        for (const broadcaster of roomBroadcasters) {
            if (!map.has(broadcaster.room_id)) {
                map.set(broadcaster.room_id, { uname: broadcaster.uname, uface: broadcaster.uface });
            }
        }
        return map;
    }, [roomBroadcasters, streamers]);

    const selectedStreamerName = detailRoomId == null
        ? null
        : roomBroadcasters.find((broadcaster) => broadcaster.room_id === detailRoomId)?.uname
            ?? streamerByRoom.get(detailRoomId)?.uname
            ?? `房间 ${detailRoomId}`;
    const detailIsProfit = (detailStats?.netProfit ?? 0) >= 0;
    const detailRecords = useMemo(() => {
        const rows = detailStats?.records ?? [];
        if (detailGiftFilter === 'all') return rows;
        return rows.filter((record) => record.gift_name === detailGiftFilter);
    }, [detailGiftFilter, detailStats]);
    const detailGiftOptions = useMemo(
        () => detailStats?.distribution.filter((item) => item.count > 0).map((item) => item.name) ?? [],
        [detailStats],
    );

    const closeDetail = () => setDetailRoomId(null);

    if (roomBroadcasters.length === 0) {
        return (
            <SectionCard>
                <EmptyState
                    icon={<Box className="h-12 w-12" />}
                    title="暂无可汇总的主播"
                    description="先在「主播管理」里接入带房间号的主播，才能查看盲盒汇总。"
                />
            </SectionCard>
        );
    }

    if (loading && !stats) {
        return <LoadingScreen tone="orange" className="h-[40vh]" />;
    }

    return (
        <div className="space-y-4">
            <section className="rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-orange-300">
                            <Box className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-base font-bold text-foreground">全部主播汇总</h2>
                            <p className="text-xs text-muted-foreground">
                                成本 {BLINDBOX_COST} 电池/盒 · {roomBroadcasters.length} 位主播
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="relative inline-flex h-9 min-w-[220px] items-center">
                            <Users className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
                            <select
                                aria-label="选择主播"
                                data-testid="admin-blindbox-streamer-select"
                                value=""
                                onChange={(event) => {
                                    const value = event.target.value;
                                    if (value) setDetailRoomId(Number(value));
                                    event.currentTarget.selectedIndex = 0;
                                }}
                                className="h-9 w-full appearance-none rounded-lg border border-border bg-popover pl-9 pr-8 text-sm font-medium text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary/40"
                            >
                                <option value="">选择主播查看详情…</option>
                                {roomBroadcasters.map((broadcaster) => (
                                    <option key={broadcaster.id} value={broadcaster.room_id}>
                                        {broadcaster.uname || '未命名'} · {broadcaster.room_id}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-muted-foreground" />
                        </label>
                        <AnalyticsDateRangePicker date={dateRange} setDate={setDateRange} />
                    </div>
                </div>
            </section>

            {stats && (
                <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-4">
                    <CompactMetric label="开盒次数" value={stats.totalBoxes.toLocaleString()} sub="盒" icon={<Box className="h-4 w-4" />} />
                    <CompactMetric label="总投入" value={formatCurrency(stats.totalCost / 10)} sub={`${stats.totalCost.toLocaleString()} 电池`} icon={<Coins className="h-4 w-4" />} />
                    <CompactMetric label="总产出" value={formatCurrency(stats.totalOutput / 10)} sub={`${stats.totalOutput.toLocaleString()} 电池`} icon={<Gift className="h-4 w-4" />} />
                    <CompactMetric
                        label="净盈亏"
                        value={`${isProfit ? '+' : '-'}${formatCurrency(Math.abs(stats.netProfit / 10))}`}
                        sub={`${isProfit ? '+' : ''}${stats.profitRate.toFixed(2)}%`}
                        icon={isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        valueClass={isProfit ? 'text-emerald-400' : 'text-red-400'}
                    />
                </div>
            )}

            <SectionCard title="礼物分布" icon={<Gift className="h-5 w-5 text-orange-300" />}>
                <div className="grid grid-cols-2 gap-2 p-3 md:grid-cols-4 xl:grid-cols-7">
                    {stats?.distribution.map((item) => (
                        <GiftDistributionCard key={item.name} item={item} totalBoxes={stats.totalBoxes} />
                    ))}
                    {(!stats || stats.distribution.length === 0) && (
                        <div className="col-span-full py-6 text-center text-sm text-muted-foreground">暂无数据</div>
                    )}
                </div>
            </SectionCard>

            <Tabs
                selectedKey={listTab}
                onSelectionChange={(key) => setListTab(String(key))}
            >
                <SectionCard
                    title={
                        listTab === 'records' ? (
                            <>
                                开盒记录
                                <span className="rounded-full border border-border bg-accent px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                                    {filteredRecords.length}/{records.length}
                                </span>
                            </>
                        ) : (
                            <>
                                主播明细
                                <span className="rounded-full border border-border bg-accent px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                                    {streamers.length}
                                </span>
                            </>
                        )
                    }
                    icon={listTab === 'records'
                        ? <ClipboardList className="h-5 w-5 text-orange-300" />
                        : <Users className="h-5 w-5 text-orange-300" />}
                    actions={
                        <>
                            <TabList aria-label="明细视图">
                                <Tab id="streamers">
                                    <Users className="h-3.5 w-3.5" />
                                    主播明细
                                </Tab>
                                <Tab id="records">
                                    <ClipboardList className="h-3.5 w-3.5" />
                                    开盒记录
                                </Tab>
                            </TabList>
                            {listTab === 'records' && (
                                <>
                                    <div className="relative w-full sm:w-[210px]">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            placeholder="搜索用户名..."
                                            value={searchInput}
                                            onChange={(event) => setSearchInput(event.target.value)}
                                            onKeyDown={(event) => event.key === 'Enter' && setSearchUsername(searchInput.trim())}
                                            className="h-9 w-full pl-9 text-sm"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => setSearchUsername(searchInput.trim())}
                                        className="h-9 rounded-lg bg-primary px-4 text-sm font-bold text-white hover:bg-primary/90"
                                    >
                                        搜索
                                    </Button>
                                    <GiftFilterSelect value={giftFilter} options={giftOptions} onChange={setGiftFilter} />
                                </>
                            )}
                        </>
                    }
                >
                    <TabPanel id="streamers">
                        <div className="dark-scrollbar overflow-x-auto">
                            <Table variant="secondary" className="min-w-[760px]">
                                <Table.Content aria-label="主播盲盒明细" className={tableChrome}>
                                    <Table.Header>
                                        <Table.Column id="streamer" isRowHeader>主播</Table.Column>
                                        <Table.Column id="boxes" className="text-right">开盒</Table.Column>
                                        <Table.Column id="cost" className="text-right">投入</Table.Column>
                                        <Table.Column id="output" className="text-right">产出</Table.Column>
                                        <Table.Column id="profit" className="text-right">净盈亏</Table.Column>
                                        <Table.Column id="rate" className="text-right">盈利率</Table.Column>
                                        <Table.Column id="actions" className="text-right">操作</Table.Column>
                                    </Table.Header>
                                    <Table.Body>
                                        {streamers.map((streamer) => {
                                            const profit = streamer.netProfit >= 0;
                                            return (
                                                <Table.Row key={streamer.roomId} id={streamer.roomId}>
                                                    <Table.Cell className="py-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-xs font-semibold text-muted-foreground">
                                                                {normalizeAvatarSrc(streamer.uface) ? (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img
                                                                        src={normalizeAvatarSrc(streamer.uface)}
                                                                        alt={streamer.uname || '主播头像'}
                                                                        className="h-full w-full object-cover"
                                                                        referrerPolicy="no-referrer"
                                                                    />
                                                                ) : (
                                                                    streamer.uname?.[0] || '?'
                                                                )}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <div className="truncate font-semibold text-foreground">{streamer.uname || '未命名'}</div>
                                                                <div className="text-xs text-muted-foreground">房间 {streamer.roomId}</div>
                                                            </div>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell className="py-1.5 text-right tabular-nums">{streamer.totalBoxes.toLocaleString()}</Table.Cell>
                                                    <Table.Cell className="py-1.5 text-right tabular-nums text-muted-foreground">{formatCurrency(streamer.totalCost / 10)}</Table.Cell>
                                                    <Table.Cell className="py-1.5 text-right tabular-nums text-muted-foreground">{formatCurrency(streamer.totalOutput / 10)}</Table.Cell>
                                                    <Table.Cell className={cn('py-1.5 text-right font-bold tabular-nums', profit ? 'text-emerald-400' : 'text-red-400')}>
                                                        {profit ? '+' : ''}{formatCurrency(streamer.netProfit / 10)}
                                                    </Table.Cell>
                                                    <Table.Cell className={cn('py-1.5 text-right font-semibold tabular-nums', profit ? 'text-emerald-400' : 'text-red-400')}>
                                                        {profit ? '+' : ''}{streamer.profitRate.toFixed(2)}%
                                                    </Table.Cell>
                                                    <Table.Cell className="py-1.5 text-right">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setDetailRoomId(streamer.roomId)}
                                                            className="h-8 rounded-lg px-3"
                                                        >
                                                            查看详情
                                                        </Button>
                                                    </Table.Cell>
                                                </Table.Row>
                                            );
                                        })}
                                    </Table.Body>
                                </Table.Content>
                            </Table>
                            {streamers.length === 0 && (
                                <EmptyState
                                    icon={<Users className="h-12 w-12" />}
                                    title="暂无主播明细"
                                    description="所选日期内还没有盲盒数据"
                                />
                            )}
                        </div>
                    </TabPanel>
                    <TabPanel id="records">
                        <BlindboxRecordsTable
                            records={filteredRecords}
                            streamerByRoom={streamerByRoom}
                            showStreamer
                            emptyDescription="调整日期、用户名或礼物筛选后再查看"
                        />
                    </TabPanel>
                </SectionCard>
            </Tabs>

            <Dialog open={detailRoomId != null} onOpenChange={(open) => { if (!open) closeDetail(); }}>
                <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-5xl flex-col gap-4 overflow-hidden p-5 sm:max-w-5xl">
                    <DialogHeader>
                        <DialogTitle className="pr-8 text-xl font-bold text-foreground">
                            {selectedStreamerName}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                            房间 {detailRoomId} · 成本 {BLINDBOX_COST} 电池/盒
                        </DialogDescription>
                    </DialogHeader>

                    {detailLoading && !detailStats ? (
                        <LoadingScreen tone="orange" className="h-[240px]" />
                    ) : (
                        <div className="dark-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                            {detailStats && (
                                <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-4">
                                    <CompactMetric label="开盒次数" value={detailStats.totalBoxes.toLocaleString()} sub="盒" icon={<Box className="h-4 w-4" />} />
                                    <CompactMetric label="总投入" value={formatCurrency(detailStats.totalCost / 10)} sub={`${detailStats.totalCost.toLocaleString()} 电池`} icon={<Coins className="h-4 w-4" />} />
                                    <CompactMetric label="总产出" value={formatCurrency(detailStats.totalOutput / 10)} sub={`${detailStats.totalOutput.toLocaleString()} 电池`} icon={<Gift className="h-4 w-4" />} />
                                    <CompactMetric
                                        label="净盈亏"
                                        value={`${detailIsProfit ? '+' : '-'}${formatCurrency(Math.abs(detailStats.netProfit / 10))}`}
                                        sub={`${detailIsProfit ? '+' : ''}${detailStats.profitRate.toFixed(2)}%`}
                                        icon={detailIsProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                        valueClass={detailIsProfit ? 'text-emerald-400' : 'text-red-400'}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
                                {detailStats?.distribution.map((item) => (
                                    <GiftDistributionCard key={item.name} item={item} totalBoxes={detailStats.totalBoxes} />
                                ))}
                            </div>

                            <div className="overflow-hidden rounded-xl border border-border">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                                    <h3 className="text-sm font-bold text-foreground">
                                        开盒记录
                                        <span className="ml-2 rounded-full border border-border bg-accent px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                                            {detailRecords.length}/{detailStats?.records.length ?? 0}
                                        </span>
                                    </h3>
                                    <GiftFilterSelect value={detailGiftFilter} options={detailGiftOptions} onChange={setDetailGiftFilter} />
                                </div>
                                <BlindboxRecordsTable
                                    records={detailRecords}
                                    emptyDescription="该主播在所选日期内没有开盒记录"
                                    compact
                                />
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function GiftFilterSelect({
    value,
    options,
    onChange,
}: {
    value: string;
    options: string[];
    onChange: (value: string) => void;
}) {
    return (
        <label className="relative inline-flex h-9 min-w-[150px] items-center">
            <Filter className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
            <select
                aria-label="筛选礼物"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-9 w-full appearance-none rounded-lg border border-border bg-popover pl-9 pr-8 text-sm font-medium text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary/40"
            >
                <option value="all">全部礼物</option>
                {options.map((giftName) => (
                    <option key={giftName} value={giftName}>{giftName}</option>
                ))}
            </select>
        </label>
    );
}

function BlindboxRecordsTable({
    records,
    streamerByRoom,
    showStreamer = false,
    emptyDescription,
    compact = false,
}: {
    records: BlindboxRecord[];
    streamerByRoom?: Map<number, { uname: string | null; uface: string | null }>;
    showStreamer?: boolean;
    emptyDescription: string;
    compact?: boolean;
}) {
    const hasRecords = records.length > 0;

    return (
        <div className={cn('dark-scrollbar relative overflow-x-auto', compact ? 'max-h-[360px]' : 'min-h-[420px]', hasRecords ? 'overflow-y-auto' : 'overflow-y-hidden')}>
            <Table variant="secondary" className={showStreamer ? 'min-w-[760px]' : 'min-w-[640px]'}>
                <Table.Content aria-label="开盒记录" className={tableChrome}>
                    <Table.Header>
                        <Table.Column id="time" isRowHeader>时间</Table.Column>
                        {showStreamer && <Table.Column id="streamer">主播</Table.Column>}
                        <Table.Column id="user">用户</Table.Column>
                        <Table.Column id="gift">礼物 / 数量</Table.Column>
                        <Table.Column id="value" className="text-right">总价值</Table.Column>
                        <Table.Column id="profit" className="text-right">盈亏状态</Table.Column>
                    </Table.Header>
                    <Table.Body>
                        {records.map((record) => {
                            const isRecordProfit = record.profit >= 0;
                            const statusText = record.profit > 0 ? '盈利' : record.profit < 0 ? '亏损' : '持平';
                            const streamer = streamerByRoom?.get(record.room_id);
                            return (
                                <Table.Row key={record.row_key} id={record.row_key}>
                                    <Table.Cell className="py-1.5 text-sm text-muted-foreground">{formatDateTime(record.ts)}</Table.Cell>
                                    {showStreamer && (
                                        <Table.Cell className="py-1.5 font-medium text-foreground">
                                            {streamer?.uname || `房间 ${record.room_id}`}
                                        </Table.Cell>
                                    )}
                                    <Table.Cell className="py-1.5">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-7 w-7 border border-border">
                                                <Avatar.Image src={record.uface ?? undefined} referrerPolicy="no-referrer" />
                                                <Avatar.Fallback className="text-xs">{record.uname?.[0] ?? '?'}</Avatar.Fallback>
                                            </Avatar>
                                            <span className="font-semibold text-foreground">{record.uname}</span>
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell className="py-1.5 font-medium text-foreground">
                                        {record.gift_name} <span className="font-bold text-muted-foreground">×{record.gift_num}</span>
                                    </Table.Cell>
                                    <Table.Cell className="py-1.5 text-right text-secondary-foreground">{record.gift_value} 电池</Table.Cell>
                                    <Table.Cell className="py-1.5 text-right">
                                        <span className={cn('font-bold', isRecordProfit ? 'text-emerald-400' : 'text-red-400')}>
                                            {isRecordProfit ? '+' : ''}{record.profit} 电池
                                        </span>
                                        <span className={cn('ml-2 text-xs font-semibold', isRecordProfit ? 'text-emerald-400' : 'text-red-400')}>
                                            {statusText}
                                        </span>
                                    </Table.Cell>
                                </Table.Row>
                            );
                        })}
                    </Table.Body>
                </Table.Content>
            </Table>

            {!hasRecords && (
                <div className={cn('flex items-center justify-center', compact ? 'py-10' : 'absolute inset-x-0 bottom-0 top-[45px]')}>
                    <EmptyState
                        icon={<ClipboardList className="h-12 w-12" />}
                        title="暂无开盒记录"
                        description={emptyDescription}
                    />
                </div>
            )}
        </div>
    );
}

function CompactMetric({
    label,
    value,
    sub,
    icon,
    valueClass,
}: {
    label: string;
    value: string;
    sub: string;
    icon: React.ReactNode;
    valueClass?: string;
}) {
    return (
        <div className="flex min-w-0 items-center gap-3 border-b border-r border-border px-3 py-2.5 last:border-r-0 lg:border-b-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-muted-foreground">{icon}</span>
            <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                    <span className={cn('truncate text-lg font-bold tabular-nums text-foreground', valueClass)}>{value}</span>
                </div>
                <div className="truncate text-[11px] text-muted-foreground tabular-nums">{sub}</div>
            </div>
        </div>
    );
}

function GiftDistributionCard({ item, totalBoxes }: { item: GiftDistribution; totalBoxes: number }) {
    const percentage = totalBoxes > 0 ? (item.count / totalBoxes) * 100 : 0;
    const valuable = item.value >= BLINDBOX_COST;

    return (
        <div className="min-w-0 rounded-lg border border-border bg-accent/40 px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                        <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', valuable ? 'bg-emerald-400' : 'bg-red-400')} />
                        <span className="truncate text-sm font-bold text-foreground">{item.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.count} 次</div>
                </div>
                <div className={cn('shrink-0 text-right text-sm font-black', valuable ? 'text-emerald-400' : 'text-red-400')}>
                    {item.value}
                    <div className="text-[10px] font-semibold text-muted-foreground">电池</div>
                </div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                    className={cn('h-full rounded-full', valuable ? 'bg-emerald-400' : 'bg-red-400')}
                    style={{ width: `${Math.max(8, Math.min(percentage, 100))}%` }}
                />
            </div>
        </div>
    );
}
