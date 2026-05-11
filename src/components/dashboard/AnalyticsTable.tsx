"use client";

import * as React from "react";
import { Avatar, Chip, Table } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDown, ArrowUp, RotateCcw, Search } from "lucide-react";

import type { Transaction } from "@/lib/data";

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

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("zh-CN", {
        style: "currency",
        currency: "CNY",
    }).format(amount);
}

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
            className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap text-left text-sm font-semibold text-zinc-100 transition-colors hover:text-white"
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
        <div className="w-full space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2">
                <div className="relative w-[260px] max-w-full">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                    <Input
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        placeholder="搜索用户 / 内容 / 金额"
                        className="h-9 rounded-xl border border-white/10 bg-white/[0.04] pl-8 text-sm text-zinc-100 placeholder:text-zinc-500 hover:bg-white/[0.06] focus:bg-white/[0.06]"
                    />
                </div>

                <div className="flex h-9 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                    {typeOptions.map((option) => (
                        <Button
                            key={option.value}
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setTypeFilter(option.value)}
                            className={[
                                "inline-flex h-9 flex-row items-center justify-center whitespace-nowrap rounded-none border-r border-white/10 px-3 text-xs last:border-r-0",
                                typeFilter === option.value
                                    ? "bg-blue-600 text-white"
                                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
                            ].join(" ")}
                        >
                            {option.label}
                        </Button>
                    ))}
                </div>

                <div className="flex h-9 items-center rounded-xl border border-white/10 bg-white/[0.04] px-2 text-sm text-zinc-400 hover:bg-white/[0.06]">
                    <span className="mr-1 text-xs">金额</span>
                    <Input
                        inputMode="decimal"
                        value={minPrice}
                        onChange={(event) => setMinPrice(event.target.value)}
                        placeholder="0"
                        className="h-7 w-14 border-0 bg-transparent p-0 text-sm text-zinc-100 placeholder:text-zinc-600 hover:bg-transparent focus:bg-transparent"
                    />
                    <span className="mx-1 text-zinc-600">-</span>
                    <Input
                        inputMode="decimal"
                        value={maxPrice}
                        onChange={(event) => setMaxPrice(event.target.value)}
                        placeholder="不限"
                        className="h-7 w-16 border-0 bg-transparent p-0 text-sm text-zinc-100 placeholder:text-zinc-600 hover:bg-transparent focus:bg-transparent"
                    />
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="inline-flex h-9 flex-row items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
                    onClick={resetFilters}
                >
                    <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                    重置
                </Button>

                <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                    <span>筛选后 {filteredData.length} / {data.length} 条</span>
                    <span>合计 {formatCurrency(summary.total)}</span>
                    <span>礼物 {summary.gift}</span>
                    <span>上舰 {summary.guard}</span>
                    <span>SC {summary.super_chat}</span>
                </div>
            </div>

            <Table variant="secondary" className="w-full overflow-hidden rounded-2xl border border-zinc-800 bg-[#18181b] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
                <Table.ScrollContainer className="w-full overflow-x-auto rounded-2xl">
                    <Table.Content
                        aria-label="营收记录明细"
                        className="w-full min-w-[920px] table-fixed border-collapse bg-[#18181b] [&_tbody_tr]:h-14 [&_tbody_tr]:border-b [&_tbody_tr]:border-zinc-800/80 [&_tbody_tr:last-child]:border-b-0 [&_tbody_tr:hover]:bg-zinc-800/55 [&_td]:px-4 [&_td]:py-2 [&_th]:h-10 [&_th]:border-b [&_th]:border-zinc-800 [&_th]:bg-[#27272a] [&_th]:px-4 [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold [&_th]:text-zinc-200"
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
                            {pageData.length ? (
                                pageData.map((item) => (
                                    <Table.Row key={item.id} id={item.id}>
                                        <Table.Cell className="whitespace-nowrap text-zinc-100">
                                            {formatTime(item.ts)}
                                        </Table.Cell>
                                        <Table.Cell>
                                            <div className="flex min-w-[180px] items-center gap-2">
                                                <Avatar size="sm" className="h-7 w-7 border border-zinc-700">
                                                    <Avatar.Image src={item.uface || undefined} referrerPolicy="no-referrer" />
                                                    <Avatar.Fallback>{item.uname?.[0] ?? "?"}</Avatar.Fallback>
                                                </Avatar>
                                                <span className="truncate font-medium text-zinc-100">{item.uname}</span>
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Chip variant="soft" size="sm" className={getTypeChipClass(item.type)}>
                                                {typeLabels[item.type]}
                                            </Chip>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <div className="max-w-[520px] truncate font-medium text-zinc-100">
                                                {item.content}
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell className="font-bold text-zinc-100">
                                            {formatCurrency(item.price)}
                                        </Table.Cell>
                                    </Table.Row>
                                ))
                            ) : (
                                <Table.Row id="empty">
                                    <Table.Cell colSpan={5} className="h-24 text-center text-zinc-500">
                                        暂无数据
                                    </Table.Cell>
                                </Table.Row>
                            )}
                        </Table.Body>
                    </Table.Content>
                </Table.ScrollContainer>
            </Table>

            <div className="flex flex-col gap-3 py-1 text-sm text-zinc-300 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                    <span>共 {filteredData.length} 条</span>
                    <div className="flex items-center gap-1">
                        <span>每页</span>
                        <div className="flex h-8 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
                            {pageSizeOptions.map((size) => (
                                <Button
                                    key={size}
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setPageSize(size)}
                                    className={[
                                        "inline-flex h-8 flex-row items-center justify-center whitespace-nowrap rounded-none border-r border-zinc-800 px-2 text-xs last:border-r-0",
                                        pageSize === size
                                            ? "bg-blue-600 text-white"
                                            : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
                                    ].join(" ")}
                                >
                                    {size}
                                </Button>
                            ))}
                        </div>
                        <span>条</span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <span className="min-w-[90px] text-center">
                        第 {currentPage + 1} / {pageCount} 页
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPageIndex((value) => Math.max(value - 1, 0))}
                        disabled={currentPage <= 0}
                        className="inline-flex h-8 flex-row items-center justify-center whitespace-nowrap rounded-md border-zinc-700 px-3 text-zinc-200 hover:bg-zinc-800"
                    >
                        上一页
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPageIndex((value) => Math.min(value + 1, pageCount - 1))}
                        disabled={currentPage >= pageCount - 1}
                        className="inline-flex h-8 flex-row items-center justify-center whitespace-nowrap rounded-md border-zinc-700 px-3 text-zinc-200 hover:bg-zinc-800"
                    >
                        下一页
                    </Button>
                    <div className="flex items-center gap-2 pl-1">
                        <span>前往</span>
                        <Input
                            inputMode="numeric"
                            value={String(currentPage + 1)}
                            onChange={(event) => {
                                const page = Number(event.target.value);
                                if (!Number.isFinite(page)) return;
                                setPageIndex(Math.min(Math.max(page - 1, 0), pageCount - 1));
                            }}
                            className="h-8 w-16 rounded-md border border-zinc-700 bg-zinc-900 text-center text-sm text-zinc-100"
                        />
                        <span>页</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
