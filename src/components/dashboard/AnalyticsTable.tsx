"use client";

import * as React from "react";
import { Avatar, Chip, Table } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDown, ArrowUp, RotateCcw, Search } from "lucide-react";

import type { Transaction } from "@/lib/data";
import { ListPager } from "@/components/shared/ListPager";
import { tableChrome } from "@/components/shared/table";
import { formatCurrency } from "@/lib/format";
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
    { value: "all", label: "全部" },
    { value: "gift", label: "礼物" },
    { value: "guard", label: "上舰" },
    { value: "super_chat", label: "SC" },
];

const pageSizeOptions = [10, 20, 50, 100];

function formatTime(ts: number) {
    return new Date(ts).toLocaleString("zh-CN", { hour12: false });
}

function getTypeChipClass(type: Transaction["type"]) {
    switch (type) {
        case "gift":
            return "border-pink-500/20 bg-pink-500/10 text-pink-300";
        case "guard":
            return "border-blue-500/20 bg-blue-500/10 text-blue-300";
        case "super_chat":
            return "border-red-500/20 bg-red-500/10 text-red-300";
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
        : <ArrowDown className="h-3 w-3 shrink-0" />;
}

function SortButton({
    children,
    active,
    direction,
    onClick,
}: {
    children: React.ReactNode;
    active: boolean;
    direction: SortDirection;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap text-left text-sm font-semibold text-foreground transition-colors hover:text-primary"
        >
            {children}
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
        return filteredData.reduce(
            (acc, item) => {
                acc.total += item.price;
                acc[item.type] += 1;
                return acc;
            },
            { total: 0, gift: 0, guard: 0, super_chat: 0 }
        );
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

    return (
        <div className="flex min-h-[520px] w-full min-w-0 max-w-full flex-col gap-3 overflow-hidden lg:min-h-0 lg:flex-1">
            <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
                <div className="relative w-full min-w-0 sm:w-[260px]">
                    <label htmlFor="analytics-search" className="sr-only">搜索用户、内容或金额</label>
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        id="analytics-search"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        placeholder="用户 / 内容 / 金额"
                        className="h-9 pl-8 text-sm"
                    />
                </div>

                <div
                    data-testid="analytics-type-filter"
                    className="grid h-9 w-full max-w-full grid-cols-4 overflow-hidden rounded-xl border border-border bg-muted/40 sm:w-auto"
                >
                    {typeOptions.map((option) => (
                        <Button
                            key={option.value}
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setTypeFilter(option.value)}
                            className={[
                                "inline-flex h-9 min-w-0 flex-row items-center justify-center whitespace-nowrap rounded-none border-r border-border px-3 text-xs last:border-r-0 sm:min-w-14",
                                typeFilter === option.value
                                    ? "bg-primary text-white"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                            ].join(" ")}
                        >
                            {option.label}
                        </Button>
                    ))}
                </div>

                <div className="flex h-9 max-w-full items-center rounded-xl border border-border bg-accent/40 px-2 text-sm text-muted-foreground">
                    <span className="mr-1 text-xs">金额</span>
                    <Input
                        inputMode="decimal"
                        value={minPrice}
                        onChange={(event) => setMinPrice(event.target.value)}
                        placeholder="0"
                        className="h-7 w-14 border-0 bg-transparent p-0 text-sm hover:bg-transparent focus:bg-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="mx-1 text-muted-foreground/60">-</span>
                    <Input
                        inputMode="decimal"
                        value={maxPrice}
                        onChange={(event) => setMaxPrice(event.target.value)}
                        placeholder="不限"
                        className="h-7 w-16 border-0 bg-transparent p-0 text-sm hover:bg-transparent focus:bg-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="inline-flex h-9 flex-row items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-muted-foreground hover:bg-accent hover:text-foreground"
                    onClick={resetFilters}
                >
                    <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                    重置
                </Button>

                <div className="flex w-full min-w-0 flex-wrap items-center gap-3 text-xs text-muted-foreground sm:ml-auto sm:w-auto">
                    <span>筛选后 {filteredData.length} / {data.length} 条</span>
                    <span>合计 {formatCurrency(summary.total)}</span>
                    <span>礼物 {summary.gift}</span>
                    <span>上舰 {summary.guard}</span>
                    <span>SC {summary.super_chat}</span>
                </div>
            </div>

            {/* HeroUI table-root is grid+overflow-clip and will not shrink; scroll this wrapper instead. */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
                <div
                    data-testid="analytics-records-viewport"
                    className={cn(
                        "dark-scrollbar min-h-[420px] min-w-0 w-full flex-1 lg:min-h-0",
                        hasRows ? "overflow-auto" : "overflow-x-auto overflow-y-hidden"
                    )}
                >
                    <Table variant="secondary" className="w-full">
                        <Table.ScrollContainer className="w-full max-w-full">
                            <Table.Content
                                aria-label="营收记录明细"
                                className={cn(tableChrome, "min-w-[920px]")}
                            >
                                <Table.Header>
                                    <Table.Column id="ts" isRowHeader className="w-[210px]">
                                        <SortButton
                                            active={sortKey === "ts"}
                                            direction={sortDirection}
                                            onClick={() => toggleSort("ts")}
                                        >
                                            时间
                                        </SortButton>
                                    </Table.Column>
                                    <Table.Column id="uname" className="w-[260px]">
                                        用户
                                    </Table.Column>
                                    <Table.Column id="type" className="w-[120px]">
                                        类型
                                    </Table.Column>
                                    <Table.Column id="content">
                                        内容
                                    </Table.Column>
                                    <Table.Column id="price" className="w-[160px]">
                                        <SortButton
                                            active={sortKey === "price"}
                                            direction={sortDirection}
                                            onClick={() => toggleSort("price")}
                                        >
                                            价值 (CNY)
                                        </SortButton>
                                    </Table.Column>
                                </Table.Header>
                                <Table.Body>
                                    {hasRows ? (
                                        pageData.map((item) => (
                                            <Table.Row key={item.id} id={item.id}>
                                                <Table.Cell className="whitespace-nowrap tabular-nums text-foreground">
                                                    {formatTime(item.ts)}
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <div className="flex min-w-[180px] items-center gap-2">
                                                        <Avatar size="sm" className="h-7 w-7 border border-border">
                                                            <Avatar.Image src={item.uface || undefined} referrerPolicy="no-referrer" />
                                                            <Avatar.Fallback>{item.uname?.[0] ?? "?"}</Avatar.Fallback>
                                                        </Avatar>
                                                        <span className="truncate font-medium text-foreground" title={item.uname}>{item.uname}</span>
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Chip variant="soft" size="sm" className={getTypeChipClass(item.type)}>
                                                        {typeLabels[item.type]}
                                                    </Chip>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <div className="max-w-[520px] truncate font-medium text-foreground" title={item.content}>
                                                        {item.content}
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell className="font-bold tabular-nums text-foreground">
                                                    {formatCurrency(item.price)}
                                                </Table.Cell>
                                            </Table.Row>
                                        ))
                                    ) : (
                                        <Table.Row id="empty">
                                            <Table.Cell colSpan={5} className="h-[360px] text-center text-muted-foreground">
                                                没有符合筛选的记录，试试清空筛选或换个日期。
                                            </Table.Cell>
                                        </Table.Row>
                                    )}
                                </Table.Body>
                            </Table.Content>
                        </Table.ScrollContainer>
                    </Table>
                </div>

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
            </div>
        </div>
    );
}
