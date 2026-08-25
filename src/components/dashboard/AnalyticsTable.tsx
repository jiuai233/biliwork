"use client";

import * as React from "react";
import { Chip, Table } from "@heroui/react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    ArrowDown,
    ArrowUp,
    Coins,
    Download,
    Gift,
    MessageSquare,
    RotateCcw,
    Search,
    Shield,
    Users,
} from "lucide-react";
import { toast } from "sonner";

import type { Transaction } from "@/lib/data";
import { ListPager } from "@/components/shared/ListPager";
import { StatCard } from "@/components/shared/StatCard";
import { tableChrome } from "@/components/shared/table";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type TransactionType = "all" | Transaction["type"];
type SortKey = "ts" | "price";
type SortDirection = "asc" | "desc";

const typeLabels: Record<Transaction["type"], string> = {
    gift: "礼物",
    guard: "上舰",
    super_chat: "SC",
};

const typeOptions: { value: TransactionType; label: string }[] = [
    { value: "all", label: "全部类型" },
    { value: "gift", label: "礼物" },
    { value: "guard", label: "上舰" },
    { value: "super_chat", label: "SC" },
];

const pageSizeOptions = [10, 20, 50, 100];

function getTypeChipClass(type: Transaction["type"]) {
    switch (type) {
        case "gift":
            return "border-pink-500/20 bg-pink-500/10 text-pink-400";
        case "guard":
            return "border-indigo-500/20 bg-indigo-500/10 text-indigo-400";
        case "super_chat":
            return "border-amber-500/20 bg-amber-500/10 text-amber-400";
    }
}

interface AnalyticsTableProps {
    data: Transaction[];
}

function SortIndicator({
    active,
    direction,
}: {
    active: boolean;
    direction: SortDirection;
}) {
    if (!active) return <ArrowDown className="h-3 w-3 shrink-0 opacity-30" />;
    return direction === "asc"
        ? <ArrowUp className="h-3 w-3 shrink-0" />
        : <ArrowDown className="h-3 w-3 shrink-0 text-primary" />;
}

function SortButton({
    children,
    active,
    direction,
    onClick,
    align = "left",
}: {
    children: React.ReactNode;
    active: boolean;
    direction: SortDirection;
    onClick: () => void;
    align?: "left" | "right";
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                "inline-flex h-7 items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-foreground transition-colors hover:text-primary",
                align === "right" ? "w-full justify-end text-right" : "text-left"
            )}
        >
            <span>{children}</span>
            <SortIndicator active={active} direction={direction} />
        </button>
    );
}

export function AnalyticsTable({ data }: AnalyticsTableProps) {
    const [keyword, setKeyword] = React.useState("");
    const [typeFilter, setTypeFilter] = React.useState<TransactionType>("all");
    const [minPrice, setMinPrice] = React.useState("");
    const [maxPrice, setMaxPrice] = React.useState("");
    const [pageSize, setPageSize] = React.useState(20);
    const [pageIndex, setPageIndex] = React.useState(0);
    const [sortKey, setSortKey] = React.useState<SortKey>("ts");
    const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");

    const filteredData = React.useMemo(() => {
        const normalizedKeyword = keyword.trim().toLowerCase();
        const min = minPrice.trim() ? Number(minPrice) : null;
        const max = maxPrice.trim() ? Number(maxPrice) : null;

        return data.filter((item) => {
            if (typeFilter !== "all" && item.type !== typeFilter) return false;
            if (min !== null && Number.isFinite(min) && item.price < min) return false;
            if (max !== null && Number.isFinite(max) && item.price > max) return false;
            if (!normalizedKeyword) return true;

            return [
                item.uname,
                item.content,
                typeLabels[item.type],
                String(item.price),
            ].join(" ").toLowerCase().includes(normalizedKeyword);
        });
    }, [data, keyword, maxPrice, minPrice, typeFilter]);

    const sortedData = React.useMemo(() => {
        const direction = sortDirection === "asc" ? 1 : -1;

        return [...filteredData].sort((a, b) => {
            return (a[sortKey] - b[sortKey]) * direction;
        });
    }, [filteredData, sortDirection, sortKey]);

    const summary = React.useMemo(() => {
        const userSet = new Set<string>();
        let giftSum = 0;
        let guardSum = 0;
        let scSum = 0;

        const res = filteredData.reduce(
            (acc, item) => {
                acc.total += item.price;
                acc[item.type] += 1;
                if (item.type === "gift") giftSum += item.price;
                else if (item.type === "guard") guardSum += item.price;
                else if (item.type === "super_chat") scSum += item.price;
                if (item.uname) userSet.add(item.uname);
                return acc;
            },
            { total: 0, gift: 0, guard: 0, super_chat: 0 }
        );

        return {
            ...res,
            giftSum,
            guardSum,
            scSum,
            uniqueUsers: userSet.size,
        };
    }, [filteredData]);

    const pageCount = Math.max(Math.ceil(sortedData.length / pageSize), 1);
    const currentPage = Math.min(pageIndex, pageCount - 1);
    const pageData = sortedData.slice(currentPage * pageSize, currentPage * pageSize + pageSize);
    const hasRows = pageData.length > 0;

    React.useEffect(() => {
        setPageIndex(0);
    }, [keyword, maxPrice, minPrice, pageSize, typeFilter]);

    const resetFilters = () => {
        setKeyword("");
        setTypeFilter("all");
        setMinPrice("");
        setMaxPrice("");
    };

    const toggleSort = (nextKey: SortKey) => {
        if (sortKey === nextKey) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
            return;
        }

        setSortKey(nextKey);
        setSortDirection("desc");
    };

    // Export CSV
    const exportCsv = React.useCallback(() => {
        if (filteredData.length === 0) {
            toast.error("当前列表没有记录可导出");
            return;
        }
        const headers = ["时间", "用户昵称", "互动类型", "详细内容", "价值(CNY)"];
        const rows = filteredData.map((item) => [
            formatDateTime(item.ts),
            `"${(item.uname ?? "").replace(/"/g, '""')}"`,
            typeLabels[item.type],
            `"${(item.content ?? "").replace(/"/g, '""')}"`,
            item.price.toFixed(2),
        ]);
        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `analytics-records-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("已导出付费互动流水 CSV");
    }, [filteredData]);

    return (
        <div className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col gap-4 overflow-y-auto lg:overflow-hidden">
            {/* Top KPI Cards */}
            <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard
                    label="总流水收入"
                    value={formatCurrency(summary.total)}
                    icon={<Coins className="h-4 w-4 text-amber-500" />}
                    tone="amber"
                    sub={`共 ${filteredData.length} 笔交易`}
                />
                <StatCard
                    label="礼物打赏"
                    value={formatCurrency(summary.giftSum)}
                    icon={<Gift className="h-4 w-4 text-pink-500" />}
                    tone="pink"
                    sub={`${summary.gift} 笔 (${summary.total > 0 ? ((summary.giftSum / summary.total) * 100).toFixed(1) : 0}%)`}
                />
                <StatCard
                    label="大航海舰长"
                    value={formatCurrency(summary.guardSum)}
                    icon={<Shield className="h-4 w-4 text-indigo-500" />}
                    tone="indigo"
                    sub={`${summary.guard} 笔 (${summary.total > 0 ? ((summary.guardSum / summary.total) * 100).toFixed(1) : 0}%)`}
                />
                <StatCard
                    label="SC 醒目留言"
                    value={formatCurrency(summary.scSum)}
                    icon={<MessageSquare className="h-4 w-4 text-yellow-500" />}
                    tone="yellow"
                    sub={`${summary.super_chat} 笔 (${summary.total > 0 ? ((summary.scSum / summary.total) * 100).toFixed(1) : 0}%)`}
                />
                <StatCard
                    label="付费互动人数"
                    value={`${summary.uniqueUsers} 人`}
                    icon={<Users className="h-4 w-4 text-emerald-500" />}
                    tone="emerald"
                    sub={summary.uniqueUsers > 0 ? `人均 ¥${(summary.total / summary.uniqueUsers).toFixed(1)}` : undefined}
                />
            </div>

            {/* Filter & Table Container */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
                {/* Filter Toolbar */}
                <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card/60 p-3 px-4">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {/* Search Input */}
                        <div className="relative w-full sm:w-52">
                            <label htmlFor="analytics-search" className="sr-only">搜索用户、内容或金额</label>
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="analytics-search"
                                value={keyword}
                                onChange={(event) => setKeyword(event.target.value)}
                                placeholder="搜索用户 / 礼物 / 内容..."
                                className="h-8 pl-8 text-base sm:text-sm"
                            />
                        </div>

                        {/* Type Switcher */}
                        <div
                            data-testid="analytics-type-filter"
                            className="flex h-8 overflow-hidden rounded-lg border border-border bg-muted/40"
                        >
                            {typeOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    aria-pressed={typeFilter === option.value}
                                    onClick={() => setTypeFilter(option.value)}
                                    className={cn(
                                        "px-2.5 text-xs font-medium transition-colors border-r border-border last:border-r-0",
                                        typeFilter === option.value
                                            ? "bg-primary text-white font-bold"
                                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>

                        {/* Price Range */}
                        <div className="flex h-8 items-center rounded-lg border border-border bg-accent/30 px-2 text-xs text-muted-foreground">
                            <span className="mr-1">金额</span>
                            <input
                                inputMode="decimal"
                                aria-label="最低金额"
                                value={minPrice}
                                onChange={(event) => setMinPrice(event.target.value)}
                                placeholder="0"
                                className="h-6 w-12 bg-transparent text-center text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/40 sm:text-sm"
                            />
                            <span className="mx-1 text-muted-foreground/60">-</span>
                            <input
                                inputMode="decimal"
                                aria-label="最高金额"
                                value={maxPrice}
                                onChange={(event) => setMaxPrice(event.target.value)}
                                placeholder="不限"
                                className="h-6 w-12 bg-transparent text-center text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/40 sm:text-sm"
                            />
                        </div>

                        {(keyword || typeFilter !== "all" || minPrice || maxPrice) && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                                onClick={resetFilters}
                            >
                                <RotateCcw className="h-3 w-3" />
                                <span>重置</span>
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 rounded-lg text-xs"
                            onClick={exportCsv}
                        >
                            <Download className="h-3 w-3 text-muted-foreground" />
                            <span>导出流水</span>
                        </Button>
                    </div>
                </div>

                {/* Table Area */}
                <div
                    data-testid="analytics-records-viewport"
                    className="dark-scrollbar min-h-0 flex-1 overflow-auto"
                >
                    <Table variant="secondary" className="w-full">
                        <Table.ScrollContainer className="w-full max-w-full">
                            <Table.Content
                                aria-label="营收记录明细"
                                className={cn(tableChrome, "min-w-[860px]")}
                            >
                                <Table.Header>
                                    <Table.Column id="ts" isRowHeader className="w-[170px] pl-5">
                                        <SortButton
                                            active={sortKey === "ts"}
                                            direction={sortDirection}
                                            onClick={() => toggleSort("ts")}
                                        >
                                            互动时间
                                        </SortButton>
                                    </Table.Column>
                                    <Table.Column id="uname" className="w-[30%] min-w-[180px]">
                                        送礼用户
                                    </Table.Column>
                                    <Table.Column id="type" className="w-[100px]">
                                        互动类型
                                    </Table.Column>
                                    <Table.Column id="content" className="w-[32%] min-w-[200px]">
                                        内容详情
                                    </Table.Column>
                                    <Table.Column id="price" className="w-[140px] pr-5 text-right">
                                        <SortButton
                                            active={sortKey === "price"}
                                            direction={sortDirection}
                                            onClick={() => toggleSort("price")}
                                            align="right"
                                        >
                                            价值 (CNY)
                                        </SortButton>
                                    </Table.Column>
                                </Table.Header>
                                <Table.Body>
                                    {hasRows ? (
                                        pageData.map((item) => (
                                            <Table.Row key={item.id} id={item.id} className="hover:bg-accent/40 transition-colors">
                                                <Table.Cell className="pl-5 font-mono text-xs text-muted-foreground">
                                                    {formatDateTime(item.ts)}
                                                </Table.Cell>
                                                <Table.Cell className="text-xs truncate">
                                                    <div className="flex items-center gap-2 truncate">
                                                        <Avatar
                                                            src={item.uface}
                                                            name={item.uname}
                                                            className="h-6 w-6 shrink-0 border border-border"
                                                        />
                                                        <span className="truncate font-semibold text-foreground" title={item.uname}>
                                                            {item.uname}
                                                        </span>
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    {item.type === "gift" && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-pink-50 text-pink-600 dark:bg-pink-950/50 dark:text-pink-300 border border-pink-200/80 dark:border-pink-800/40">
                                                            礼物
                                                        </span>
                                                    )}
                                                    {item.type === "guard" && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/40">
                                                            上舰
                                                        </span>
                                                    )}
                                                    {item.type === "super_chat" && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40">
                                                            SC
                                                        </span>
                                                    )}
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <div className="max-w-[420px] truncate text-xs font-medium text-foreground" title={item.content}>
                                                        {item.content}
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell className="pr-5 text-right font-mono font-bold text-xs text-money">
                                                    {formatCurrency(item.price)}
                                                </Table.Cell>
                                            </Table.Row>
                                        ))
                                    ) : (
                                        <Table.Row id="empty">
                                            <Table.Cell colSpan={5} className="py-16 text-center text-muted-foreground">
                                                没有符合筛选条件的付费记录，请尝试调整搜索或时间范围。
                                            </Table.Cell>
                                        </Table.Row>
                                    )}
                                </Table.Body>
                            </Table.Content>
                        </Table.ScrollContainer>
                    </Table>
                </div>

                {/* Pagination */}
                {filteredData.length > 0 && (
                    <ListPager
                        testId="analytics-pagination"
                        total={filteredData.length}
                        page={currentPage + 1}
                        pageCount={pageCount}
                        pageSize={pageSize}
                        pageSizeOptions={pageSizeOptions}
                        onPageChange={(next) => setPageIndex(next - 1)}
                        onPageSizeChange={setPageSize}
                    />
                )}
            </div>
        </div>
    );
}

