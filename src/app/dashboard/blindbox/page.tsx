'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { endOfDay, startOfDay, subDays } from "date-fns";
import { toast } from "sonner";
import { Table } from "@heroui/react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Box,
    Coins,
    Download,
    Filter,
    Gift,
    PieChart,
    Search,
    TrendingDown,
    TrendingUp,
} from "lucide-react";
import { getBlindboxData } from "./actions";
import { AnalyticsDateRangePicker, type DateRange } from "@/components/dashboard/AnalyticsDateRangePicker";
import { ListPager, useClientPager } from "@/components/shared/ListPager";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatCard } from "@/components/shared/StatCard";
import { tableChrome } from "@/components/shared/table";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { BLINDBOX_COST, BlindboxStats, Broadcaster, GiftDistribution } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function BlindboxPage() {
    const [loading, setLoading] = useState(true);
    const [distributionModalOpen, setDistributionModalOpen] = useState(false);
    const [data, setData] = useState<{
        broadcaster: Broadcaster | null;
        stats: BlindboxStats | null;
    }>({
        broadcaster: null,
        stats: null,
    });

    // Default to last 30 days to avoid empty state on today
    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        const today = new Date();
        return { from: subDays(today, 30), to: today };
    });

    const [searchUsername, setSearchUsername] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [giftFilter, setGiftFilter] = useState("all");
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

    // Export CSV
    const exportCsv = useCallback(() => {
        if (!records || records.length === 0) {
            toast.error('当前列表没有开盒记录可导出');
            return;
        }
        const headers = ['开盒时间', '用户昵称', '产出礼物', '数量', '单价(电池)', '总价值(电池)', '净盈亏(电池)', '盈亏状态'];
        const rows = filteredRecords.map((r) => [
            formatDateTime(r.ts),
            `"${(r.uname ?? '').replace(/"/g, '""')}"`,
            `"${(r.gift_name ?? '').replace(/"/g, '""')}"`,
            r.gift_num,
            r.gift_value / (r.gift_num || 1),
            r.gift_value,
            r.profit,
            r.profit > 0 ? '盈利' : r.profit < 0 ? '亏损' : '持平',
        ]);
        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `blindbox-records-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('已导出盲盒开盒明细 CSV');
    }, [filteredRecords, records]);

    // Return rate calculation (产出 / 投入)
    const returnRate = stats && stats.totalCost > 0
        ? (stats.totalOutput / stats.totalCost) * 100
        : 0;

    if (loading && !data.broadcaster) {
        return <LoadingScreen tone="orange" />;
    }

    return (
        <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col space-y-4 lg:space-y-0 lg:gap-4 overflow-y-auto lg:overflow-hidden">
            {/* Header */}
            <PageHeader
                icon={<Box className="h-5 w-5" />}
                iconClass="bg-orange-500/15 text-orange-400"
                title="心动盲盒分析"
                description={
                    <span className="flex flex-wrap items-center gap-2 text-xs">
                        <span>按成本 {BLINDBOX_COST} 电池/盒反推统计开盒盈亏与爆率分布</span>
                        {data.broadcaster?.uname && (
                            <>
                                <span className="text-border">•</span>
                                <span className="text-muted-foreground font-mono">
                                    主播: {data.broadcaster.uname}
                                </span>
                            </>
                        )}
                    </span>
                }
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <AnalyticsDateRangePicker date={dateRange} setDate={setDateRange} />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1 rounded-lg text-xs"
                            onClick={exportCsv}
                        >
                            <Download className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="hidden sm:inline">导出记录</span>
                        </Button>
                    </div>
                }
            />

            {/* 4 Metric KPI Cards */}
            {stats && (
                <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatCard
                        label="开盒总次数"
                        icon={<Box className="h-4 w-4 text-orange-500" />}
                        value={`${stats.totalBoxes.toLocaleString()} 盒`}
                        sub="所选区间统计"
                        tone="orange"
                    />
                    <StatCard
                        label="总投入成本"
                        icon={<Coins className="h-4 w-4 text-amber-500" />}
                        value={formatCurrency(stats.totalCost / 10)}
                        sub={`${stats.totalCost.toLocaleString()} 电池 (每盒${BLINDBOX_COST})`}
                        tone="amber"
                    />
                    <StatCard
                        label="礼物总产出"
                        icon={<Gift className="h-4 w-4 text-sky-500" />}
                        value={formatCurrency(stats.totalOutput / 10)}
                        sub={`${stats.totalOutput.toLocaleString()} 电池`}
                        tone="sky"
                    />
                    <StatCard
                        label="净盈亏收益"
                        icon={isProfit ? <TrendingUp className="h-4 w-4 text-profit" /> : <TrendingDown className="h-4 w-4 text-loss" />}
                        value={`${isProfit ? "+" : "-"}${formatCurrency(Math.abs(stats.netProfit / 10))}`}
                        sub={`${isProfit ? "+" : ""}${stats.profitRate.toFixed(2)}% 盈利率`}
                        tone={isProfit ? "emerald" : "orange"}
                        delta={
                            isProfit
                                ? <TrendingUp className="h-3.5 w-3.5 text-profit" />
                                : <TrendingDown className="h-3.5 w-3.5 text-loss" />
                        }
                    />
                </div>
            )}

            {/* Main Records Table (Full Height Viewport) */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
                {/* Header Bar with Filters */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/60 p-3 px-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-foreground">开盒明细流水</span>
                        <span className="font-mono text-xs text-muted-foreground">
                            (共 {filteredRecords.length} 条)
                        </span>

                        {/* Prominent High-Visibility Button */}
                        <button
                            type="button"
                            onClick={() => setDistributionModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/25 text-xs font-semibold transition-colors shadow-xs"
                        >
                            <PieChart className="h-3.5 w-3.5 text-orange-500" />
                            <span>查看爆率分布分析</span>
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative w-full sm:w-44">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                aria-label="搜索用户名"
                                placeholder="按用户名筛选..."
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                onKeyDown={(event) => event.key === "Enter" && handleSearch()}
                                className="h-8 w-full pl-8 text-base sm:text-sm"
                            />
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleSearch}
                            className="h-8 rounded-lg px-3 text-xs"
                        >
                            搜索
                        </Button>
                        <label className="relative inline-flex h-8 min-w-[130px] items-center">
                            <Filter className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <select
                                aria-label="筛选礼物"
                                value={giftFilter}
                                onChange={(event) => setGiftFilter(event.target.value)}
                                className="h-8 w-full appearance-none rounded-lg border border-border bg-popover pl-8 pr-7 text-base font-medium text-foreground hover:bg-accent focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:text-sm"
                            >
                                <option value="all">全部礼物种类</option>
                                {giftOptions.map((giftName) => (
                                    <option key={giftName} value={giftName}>{giftName}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>

                {/* Table Viewport */}
                <div
                    data-testid="blindbox-records-viewport"
                    className="dark-scrollbar min-h-0 flex-1 overflow-auto"
                >
                    <Table variant="secondary" className="w-full">
                        <Table.ScrollContainer className="w-full">
                            <Table.Content aria-label="开盒记录" className={`${tableChrome} min-w-[720px]`}>
                                <Table.Header>
                                    <Table.Column id="time" isRowHeader className="w-[160px] pl-5">开盒时间</Table.Column>
                                    <Table.Column id="user" className="w-[28%]">送礼用户</Table.Column>
                                    <Table.Column id="gift" className="w-[26%]">产出礼物与数量</Table.Column>
                                    <Table.Column id="value" className="w-[130px] text-right">总价值 (电池)</Table.Column>
                                    <Table.Column id="profit" className="w-[140px] pr-5 text-right">盈亏状态</Table.Column>
                                </Table.Header>
                                <Table.Body>
                                    {recordPager.slice.map((record) => {
                                        const isRecordProfit = record.profit >= 0;
                                        const statusText = record.profit > 0 ? "盈利" : record.profit < 0 ? "亏损" : "持平";
                                        return (
                                            <Table.Row key={record.row_key} id={record.row_key} className="hover:bg-accent/40 transition-colors">
                                                <Table.Cell className="pl-5 font-mono text-xs text-muted-foreground">
                                                    {formatDateTime(record.ts)}
                                                </Table.Cell>
                                                <Table.Cell className="text-xs truncate">
                                                    <div className="flex items-center gap-2 truncate">
                                                        <Avatar
                                                            src={record.uface}
                                                            name={record.uname}
                                                            className="h-6 w-6 shrink-0"
                                                        />
                                                        <span className="truncate font-semibold text-foreground" title={record.uname || undefined}>
                                                            {record.uname || "匿名用户"}
                                                        </span>
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell className="text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-medium text-foreground">{record.gift_name}</span>
                                                        <span className="font-bold text-muted-foreground font-mono">×{record.gift_num}</span>
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell className="text-right font-mono text-xs text-foreground">
                                                    {record.gift_value.toLocaleString()} 电池
                                                </Table.Cell>
                                                <Table.Cell className="pr-5 text-right font-mono text-xs">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <span className={cn("font-bold", isRecordProfit ? "text-emerald-500" : "text-loss")}>
                                                            {isRecordProfit ? "+" : ""}{record.profit} 电池
                                                        </span>
                                                        <span className={cn("px-1.5 py-0.2 rounded text-[10px] font-sans font-bold", isRecordProfit ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-loss/10 text-loss border border-loss/20")}>
                                                            {statusText}
                                                        </span>
                                                    </div>
                                                </Table.Cell>
                                            </Table.Row>
                                        );
                                    })}
                                    {!hasRecords && (
                                        <Table.Row id="empty">
                                            <Table.Cell colSpan={5} className="py-16 text-center text-muted-foreground">
                                                暂无开盒记录，请尝试更换日期、用户名或礼物筛选条件。
                                            </Table.Cell>
                                        </Table.Row>
                                    )}
                                </Table.Body>
                            </Table.Content>
                        </Table.ScrollContainer>
                    </Table>
                </div>

                {/* Pagination */}
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
            </div>

            {/* Distribution Modal Dialog */}
            <Dialog open={distributionModalOpen} onOpenChange={setDistributionModalOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <PieChart className="h-4 w-4 text-orange-500" />
                            <span>心动盲盒爆率与产出分析</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            所选时间区间内开盒的整体回本产出率与单项礼物爆出概率明细
                        </DialogDescription>
                    </DialogHeader>

                    {/* Modal Content */}
                    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
                        {/* ROI & Balance Summary Card */}
                        {stats && (
                            <div className="rounded-xl border border-border bg-accent/30 p-4 space-y-3 shrink-0">
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="p-2 rounded-lg bg-card border border-border">
                                        <div className="text-[11px] text-muted-foreground">总投入成本</div>
                                        <div className="text-sm font-bold font-mono text-foreground mt-0.5">
                                            {stats.totalCost.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">电池</span>
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">¥{(stats.totalCost / 10).toLocaleString()}</div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-card border border-border">
                                        <div className="text-[11px] text-muted-foreground">礼物总产出</div>
                                        <div className="text-sm font-bold font-mono text-emerald-500 mt-0.5">
                                            {stats.totalOutput.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">电池</span>
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">¥{(stats.totalOutput / 10).toLocaleString()}</div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-card border border-border">
                                        <div className="text-[11px] text-muted-foreground">回本产出率</div>
                                        <div className={cn("text-sm font-bold font-mono mt-0.5", returnRate >= 100 ? "text-emerald-500" : "text-loss")}>
                                            {returnRate.toFixed(2)}%
                                        </div>
                                        <div className={cn("text-[10px] font-mono", isProfit ? "text-emerald-500" : "text-loss")}>
                                            {isProfit ? "+" : ""}{formatCurrency(stats.netProfit / 10)}
                                        </div>
                                    </div>
                                </div>

                                {/* Single Clear Progress Meter */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[11px] text-muted-foreground">
                                        <span>产出回报进度</span>
                                        <span className="font-mono">{returnRate.toFixed(1)}% / 100% 保本线</span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                        <div
                                            className={cn("h-full transition-all rounded-full", returnRate >= 100 ? "bg-emerald-500" : "bg-orange-500")}
                                            style={{ width: `${Math.min(100, Math.max(0, returnRate))}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Gift Distribution List */}
                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-foreground">全部产出礼物明细 ({stats?.distribution.filter(i => i.count > 0).length ?? 0} 种)</div>
                            <div className="rounded-xl border border-border overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                                        <tr>
                                            <th className="py-2.5 px-3">礼物名称</th>
                                            <th className="py-2.5 px-3 text-right">单价</th>
                                            <th className="py-2.5 px-3 text-right">爆出次数 (爆率)</th>
                                            <th className="py-2.5 px-3 text-right">单盒盈亏</th>
                                            <th className="py-2.5 px-3 text-right">总产出价值</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border font-mono">
                                        {stats?.distribution.map((item) => {
                                            const valuable = item.value >= BLINDBOX_COST;
                                            const profitPerBox = item.value - BLINDBOX_COST;
                                            const rate = stats.totalBoxes > 0 ? (item.count / stats.totalBoxes) * 100 : 0;
                                            return (
                                                <tr key={item.name} className="hover:bg-accent/30 transition-colors">
                                                    <td className="py-2 px-3 font-sans">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={cn("h-2 w-2 rounded-full shrink-0", valuable ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                                                            <span className="font-semibold text-foreground">{item.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-3 text-right text-muted-foreground">
                                                        {item.value} 电池
                                                    </td>
                                                    <td className="py-2 px-3 text-right">
                                                        <span className="text-foreground font-bold">{item.count} 次</span>
                                                        <span className="text-[10px] text-muted-foreground ml-1 font-sans">({rate.toFixed(1)}%)</span>
                                                    </td>
                                                    <td className="py-2 px-3 text-right font-sans">
                                                        <span className={cn("px-1.5 py-0.2 rounded text-[10px] font-bold", valuable ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-muted text-muted-foreground")}>
                                                            {valuable ? `+${profitPerBox} 电池` : `${profitPerBox} 电池`}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-3 text-right font-bold text-foreground">
                                                        {item.totalValue.toLocaleString()} 电池
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}


