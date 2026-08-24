'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { endOfDay, startOfDay } from "date-fns";
import { toast } from "sonner";
import { Avatar, Table } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { getBlindboxData } from "./actions";
import { AnalyticsDateRangePicker, type DateRange } from "@/components/dashboard/AnalyticsDateRangePicker";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListPager, useClientPager } from "@/components/shared/ListPager";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { tableChrome } from "@/components/shared/table";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { BLINDBOX_COST, BlindboxStats, Broadcaster, GiftDistribution } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function BlindboxPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{
        broadcaster: Broadcaster | null;
        stats: BlindboxStats | null;
    }>({
        broadcaster: null,
        stats: null,
    });

    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(),
        to: new Date(),
    });

    const [searchUsername, setSearchUsername] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [giftFilter, setGiftFilter] = useState("all");
    const [distributionOpen, setDistributionOpen] = useState(false);
    const requestIdRef = useRef(0);

    const fetchData = useCallback(async (showError = false) => {
        const requestId = ++requestIdRef.current;
        try {
            if (!dateRange?.from) return;

            const start = startOfDay(dateRange.from).getTime();
            const end = endOfDay(dateRange.to || dateRange.from).getTime();
            const result = await getBlindboxData(start, end, searchUsername || undefined);
            if (requestId === requestIdRef.current) setData(result);
        } catch (error) {
            console.error("Fetch Error:", error);
            if (showError && requestId === requestIdRef.current) toast.error("无法加载盲盒数据，请刷新后重试");
        } finally {
            if (requestId === requestIdRef.current) setLoading(false);
        }
    }, [dateRange, searchUsername]);

    useEffect(() => {
        setLoading(true);
        setGiftFilter("all");
        fetchData(true);
    }, [fetchData]);

    useEffect(() => {
        const interval = setInterval(() => {
            fetchData();
        }, 5000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleSearch = () => {
        setSearchUsername(searchInput.trim());
    };

    const stats = data.stats;
    const isProfit = (stats?.netProfit ?? 0) >= 0;
    const records = useMemo(() => stats?.records ?? [], [stats]);
    const giftOptions = useMemo(() => {
        return stats?.distribution
            .filter((item) => item.count > 0)
            .map((item) => item.name) ?? [];
    }, [stats]);
    const filteredRecords = useMemo(() => {
        if (giftFilter === "all") return records;
        return records.filter((record) => record.gift_name === giftFilter);
    }, [giftFilter, records]);
    const hasRecords = filteredRecords.length > 0;
    const recordPager = useClientPager(filteredRecords, 20);

    if (loading && !data.broadcaster) {
        return <LoadingScreen tone="orange" />;
    }

    return (
        <div className="space-y-6">
            <PageHeader
                icon={<Box className="h-6 w-6" />}
                iconClass="bg-orange-500/15 text-orange-300"
                title="心动盲盒分析"
                description={<span>成本 {BLINDBOX_COST} 电池/盒，按所选日期统计开盒盈亏。</span>}
                actions={<AnalyticsDateRangePicker date={dateRange} setDate={setDateRange} />}
            />

            {stats && (
                <div className="grid shrink-0 grid-cols-2 overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-4">
                    <CompactMetric label="开盒次数" value={stats.totalBoxes.toLocaleString()} sub="盒" icon={<Box className="h-4 w-4" />} />
                    <CompactMetric label="总投入" value={formatCurrency(stats.totalCost / 10)} sub={`${stats.totalCost.toLocaleString()} 电池`} icon={<Coins className="h-4 w-4" />} />
                    <CompactMetric label="总产出" value={formatCurrency(stats.totalOutput / 10)} sub={`${stats.totalOutput.toLocaleString()} 电池`} icon={<Gift className="h-4 w-4" />} />
                    <CompactMetric
                        label="净盈亏"
                        value={`${isProfit ? "+" : "-"}${formatCurrency(Math.abs(stats.netProfit / 10))}`}
                        sub={`${isProfit ? "+" : ""}${stats.profitRate.toFixed(2)}%`}
                        icon={isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        valueClass={isProfit ? "text-emerald-400" : "text-red-400"}
                    />
                </div>
            )}

            <div className="space-y-4 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:space-y-0 lg:gap-4">
                <SectionCard
                    className="shrink-0"
                    title="礼物分布"
                    icon={<Gift className="h-5 w-5 text-orange-300" />}
                    actions={
                        <button
                            type="button"
                            onClick={() => setDistributionOpen((open) => !open)}
                            aria-expanded={distributionOpen}
                            className="flex h-8 items-center gap-2 rounded-md px-2 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
                        >
                            {stats?.distribution.filter((item) => item.count > 0).length ?? 0} 种有产出
                            <span className="text-orange-300">{distributionOpen ? "收起" : "展开"}</span>
                            <ChevronDown className={cn("h-4 w-4 transition-transform", distributionOpen && "rotate-180")} />
                        </button>
                    }
                >
                    {distributionOpen && (
                        <div
                            data-testid="blindbox-distribution-grid"
                            className="grid grid-cols-2 gap-2 p-3 md:grid-cols-4 xl:grid-cols-7"
                        >
                            {stats?.distribution.map((item) => (
                                <GiftDistributionCard key={item.name} item={item} totalBoxes={stats.totalBoxes} />
                            ))}
                            {(!stats || stats.distribution.length === 0) && (
                                <div className="col-span-full py-6 text-center text-sm text-muted-foreground">暂无数据</div>
                            )}
                        </div>
                    )}
                </SectionCard>

                <SectionCard
                    accent="bg-orange-500"
                    title={
                        <>
                            开盒记录
                            <span className="rounded-full border border-border bg-accent px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                                {filteredRecords.length}/{records.length}
                            </span>
                        </>
                    }
                    actions={
                        <>
                            <div className="relative w-full sm:w-[210px]">
                                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    aria-label="搜索用户名"
                                    placeholder="用户名"
                                    value={searchInput}
                                    onChange={(event) => setSearchInput(event.target.value)}
                                    onKeyDown={(event) => event.key === "Enter" && handleSearch()}
                                    className="h-9 w-full pl-9 text-sm"
                                />
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleSearch}
                                className="h-9 rounded-lg bg-primary px-4 text-sm font-bold text-white hover:bg-primary/90"
                            >
                                搜索
                            </Button>
                            <label className="relative inline-flex h-9 min-w-[150px] items-center">
                                <Filter className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
                                <select
                                    aria-label="筛选礼物"
                                    value={giftFilter}
                                    onChange={(event) => setGiftFilter(event.target.value)}
                                    className="h-9 w-full appearance-none rounded-lg border border-border bg-popover pl-9 pr-8 text-sm font-medium text-foreground outline-none hover:bg-accent focus:border-orange-400/60 focus-visible:ring-2 focus-visible:ring-primary/40"
                                >
                                    <option value="all">全部礼物</option>
                                    {giftOptions.map((giftName) => (
                                        <option key={giftName} value={giftName}>{giftName}</option>
                                    ))}
                                </select>
                            </label>
                        </>
                    }
                >
                    <div
                        data-testid="blindbox-records-viewport"
                        className={cn(
                            "dark-scrollbar relative overflow-x-auto",
                            hasRecords ? "overflow-y-auto" : "overflow-y-hidden"
                        )}
                    >
                        <Table variant="secondary" className="min-w-[680px]">
                            <Table.Content aria-label="开盒记录" className={tableChrome}>
                                <Table.Header>
                                    <Table.Column id="time" isRowHeader>时间</Table.Column>
                                    <Table.Column id="user">用户</Table.Column>
                                    <Table.Column id="gift">礼物 / 数量</Table.Column>
                                    <Table.Column id="value" className="text-right">总价值</Table.Column>
                                    <Table.Column id="profit" className="text-right">盈亏状态</Table.Column>
                                </Table.Header>
                                <Table.Body>
                                    {recordPager.slice.map((record) => {
                                        const isRecordProfit = record.profit >= 0;
                                        const statusText = record.profit > 0 ? "盈利" : record.profit < 0 ? "亏损" : "持平";
                                        return (
                                            <Table.Row key={record.row_key} id={record.row_key}>
                                                <Table.Cell className="py-1.5 text-sm text-muted-foreground">{formatDateTime(record.ts)}</Table.Cell>
                                                <Table.Cell className="py-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-7 w-7 border border-border">
                                                            <Avatar.Image src={record.uface ?? undefined} referrerPolicy="no-referrer" />
                                                            <Avatar.Fallback className="text-xs">{record.uname?.[0] ?? "?"}</Avatar.Fallback>
                                                        </Avatar>
                                                        <span className="font-semibold text-foreground">{record.uname}</span>
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell className="py-1.5 font-medium text-foreground">
                                                    {record.gift_name} <span className="font-bold text-muted-foreground">×{record.gift_num}</span>
                                                </Table.Cell>
                                                <Table.Cell className="py-1.5 text-right text-secondary-foreground">{record.gift_value} 电池</Table.Cell>
                                                <Table.Cell className="py-1.5 text-right">
                                                    <span className={cn("font-bold", isRecordProfit ? "text-emerald-400" : "text-red-400")}>
                                                        {isRecordProfit ? "+" : ""}{record.profit} 电池
                                                    </span>
                                                    <span className={cn("ml-2 text-xs font-semibold", isRecordProfit ? "text-emerald-400" : "text-red-400")}>
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
                            <EmptyState
                                icon={<ClipboardList className="h-12 w-12" />}
                                title="暂无开盒记录"
                                description="调整日期、用户名或礼物筛选后再查看"
                            />
                        )}
                    </div>
                    {hasRecords && (
                        <ListPager
                            total={recordPager.total}
                            page={recordPager.page}
                            pageCount={recordPager.pageCount}
                            pageSize={recordPager.pageSize}
                            onPageChange={recordPager.setPage}
                            onPageSizeChange={recordPager.setPageSize}
                        />
                    )}
                </SectionCard>
            </div>
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
                    <span className={cn("truncate text-lg font-bold tabular-nums text-foreground", valueClass)}>{value}</span>
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
                        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", valuable ? "bg-emerald-400" : "bg-red-400")} />
                        <span className="truncate text-sm font-bold text-foreground" title={item.name}>{item.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.count} 次</div>
                </div>
                <div className={cn("shrink-0 text-right text-sm font-black tabular-nums", valuable ? "text-emerald-400" : "text-red-400")}>
                    {item.value}
                    <div className="text-[11px] font-semibold text-muted-foreground">{valuable ? "高于成本" : "低于成本"}</div>
                </div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                    className={cn("h-full rounded-full", valuable ? "bg-emerald-400" : "bg-red-400")}
                    style={{ width: `${Math.max(8, Math.min(percentage, 100))}%` }}
                />
            </div>
        </div>
    );
}
