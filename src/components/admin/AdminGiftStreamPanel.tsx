'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { endOfDay, startOfDay } from 'date-fns';
import { Gift, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Table } from '@heroui/react';
import { getAdminGiftStreamOverviewAction } from '@/app/admin/actions';
import { AnalyticsDateRangePicker, type DateRange } from '@/components/dashboard/AnalyticsDateRangePicker';
import { EmptyState } from '@/components/shared/EmptyState';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatCard } from '@/components/shared/StatCard';
import { tableChrome } from '@/components/shared/table';
import { formatCurrency, normalizeAvatarSrc } from '@/lib/format';
import type { AdminGiftStreamOverview } from '@/lib/services/gift-stream';

function defaultDateRange(): DateRange {
    const now = new Date();
    return { from: new Date(now.getFullYear(), 0, 1), to: now };
}

function syncLabel(status: string): string {
    if (status === 'queued') return '排队中';
    if (status === 'running') return '同步中';
    if (status === 'done') return '已完成';
    if (status === 'error') return '失败';
    return '未同步';
}

export function AdminGiftStreamPanel() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AdminGiftStreamOverview | null>(null);
    const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);
    const requestRef = useRef(0);

    const load = useCallback(async () => {
        const requestId = ++requestRef.current;
        const from = dateRange.from ?? new Date(new Date().getFullYear(), 0, 1);
        const to = dateRange.to ?? from;
        try {
            const result = await getAdminGiftStreamOverviewAction(
                startOfDay(from).getTime(),
                endOfDay(to).getTime(),
            );
            if (requestId === requestRef.current) setData(result);
        } catch {
            toast.error('加载礼物流水总览失败');
        } finally {
            if (requestId === requestRef.current) setLoading(false);
        }
    }, [dateRange.from, dateRange.to]);

    useEffect(() => {
        void load();
    }, [load]);

    if (loading && !data) {
        return (
            <SectionCard>
                <EmptyState
                    icon={<Loader2 className="h-6 w-6 animate-spin text-primary" />}
                    title="正在汇总礼物流水"
                />
            </SectionCard>
        );
    }

    return (
        <div className="space-y-4">
            <section className="rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-base font-bold text-foreground">创作者中心收礼总览</h2>
                        <p className="text-xs text-muted-foreground">
                            口径是扫码拉取的礼物流水，不是直播间实时采集。
                        </p>
                    </div>
                    <AnalyticsDateRangePicker date={dateRange} setDate={(next) => setDateRange(next ?? defaultDateRange())} />
                </div>
            </section>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="有数据主播" value={(data?.streamerCount ?? 0).toLocaleString('zh-CN')} tone="purple" />
                <StatCard label="唯一礼物" value={(data?.uniqueCount ?? 0).toLocaleString('zh-CN')} tone="sky" />
                <StatCard
                    label="税前收益"
                    value={formatCurrency((data?.hamsterTotal ?? 0) / 500)}
                    sub={`${(data?.batteryTotal ?? 0).toLocaleString('zh-CN')} 电池`}
                    tone="amber"
                />
                <StatCard
                    label="金仓鼠"
                    value={(data?.hamsterTotal ?? 0).toLocaleString('zh-CN')}
                    tone="emerald"
                />
            </div>

            <SectionCard title="主播明细" accent="bg-primary">
                {!data || data.rows.length === 0 ? (
                    <EmptyState
                        icon={<Gift className="h-6 w-6" />}
                        title="还没有礼物流水"
                        description="主播扫码同步后会出现在这里。"
                    />
                ) : (
                    <Table variant="secondary">
                        <Table.ScrollContainer className="dark-scrollbar overflow-x-auto">
                            <Table.Content aria-label="礼物流水总览" className={tableChrome}>
                                <Table.Header>
                                    <Table.Column id="streamer" isRowHeader>主播</Table.Column>
                                    <Table.Column id="uid">UID</Table.Column>
                                    <Table.Column id="sync">同步</Table.Column>
                                    <Table.Column id="unique" className="text-right">唯一礼物</Table.Column>
                                    <Table.Column id="hamster" className="text-right">金仓鼠</Table.Column>
                                    <Table.Column id="money" className="text-right">税前收益</Table.Column>
                                </Table.Header>
                                <Table.Body>
                                    {data.rows.map((row) => (
                                        <Table.Row key={row.broadcasterId} id={row.broadcasterId}>
                                            <Table.Cell>
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs">
                                                        {normalizeAvatarSrc(row.uface) ? (
                                                            // Bilibili avatar CDN may reject requests with a page Referer.
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img
                                                                src={normalizeAvatarSrc(row.uface)}
                                                                alt=""
                                                                className="h-7 w-7 object-cover"
                                                                referrerPolicy="no-referrer"
                                                            />
                                                        ) : (
                                                            (row.uname || '?').slice(0, 1)
                                                        )}
                                                    </span>
                                                    <span className="truncate">{row.uname || '未命名'}</span>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell className="tabular-nums text-sm">{row.uid ?? '-'}</Table.Cell>
                                            <Table.Cell className="text-sm">{syncLabel(row.syncStatus)}</Table.Cell>
                                            <Table.Cell className="text-right tabular-nums">{row.uniqueCount.toLocaleString('zh-CN')}</Table.Cell>
                                            <Table.Cell className="text-right tabular-nums">{row.hamster.toLocaleString('zh-CN')}</Table.Cell>
                                            <Table.Cell className="text-right tabular-nums text-money">
                                                {formatCurrency(row.hamster / 500)}
                                            </Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table.Content>
                        </Table.ScrollContainer>
                    </Table>
                )}
            </SectionCard>
        </div>
    );
}
