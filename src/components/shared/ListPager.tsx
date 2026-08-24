"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function useClientPager<T>(items: T[], defaultSize = 20) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(defaultSize);
    const pageCount = Math.max(1, Math.ceil(items.length / pageSize) || 1);
    const safePage = Math.min(page, pageCount);

    useEffect(() => {
        setPage(1);
    }, [items, pageSize]);

    const slice = useMemo(
        () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
        [items, pageSize, safePage],
    );

    return {
        page: safePage,
        pageSize,
        pageCount,
        total: items.length,
        slice,
        setPage,
        setPageSize,
    };
}

export const DEFAULT_PAGE_SIZES = [10, 20, 50, 100] as const;

interface SizeSegmentProps {
    value: number;
    options?: readonly number[];
    onChange: (next: number) => void;
    label?: string;
    unit?: string;
    className?: string;
}

export function SizeSegment({
    value,
    options = DEFAULT_PAGE_SIZES,
    onChange,
    label = "每页",
    unit = "条",
    className,
}: SizeSegmentProps) {
    return (
        <div className={cn("flex items-center gap-1", className)}>
            <span>{label}</span>
            <div
                role="group"
                aria-label={label}
                className="flex h-8 overflow-hidden rounded-md border border-border bg-muted/40"
            >
                {options.map((size) => (
                    <Button
                        key={size}
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-pressed={value === size}
                        onClick={() => onChange(size)}
                        className={[
                            "inline-flex h-8 flex-row items-center justify-center whitespace-nowrap rounded-none border-r border-border px-2 text-xs last:border-r-0",
                            value === size
                                ? "bg-primary text-white"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground",
                        ].join(" ")}
                    >
                        {size}
                    </Button>
                ))}
            </div>
            {unit ? <span>{unit}</span> : null}
        </div>
    );
}

interface ListPagerProps {
    total: number;
    page: number;
    pageCount: number;
    pageSize: number;
    pageSizeOptions?: readonly number[];
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    sizeLabel?: string;
    sizeUnit?: string;
    className?: string;
    testId?: string;
}

export function ListPager({
    total,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    onPageChange,
    onPageSizeChange,
    sizeLabel = "每页",
    sizeUnit = "条",
    className,
    testId = "list-pager",
}: ListPagerProps) {
    const jumpId = `list-pager-jump-${testId}`;

    return (
        <div
            data-testid={testId}
            className={cn(
                "relative z-10 flex w-full shrink-0 justify-end border-t border-border bg-card px-4 py-3 text-sm text-secondary-foreground",
                className,
            )}
        >
            <div className="ms-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
                <span>共 {total.toLocaleString("zh-CN")} 条</span>
                <SizeSegment
                    value={pageSize}
                    options={pageSizeOptions}
                    onChange={onPageSizeChange}
                    label={sizeLabel}
                    unit={sizeUnit}
                />
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="min-w-[90px] text-center tabular-nums">
                        第 {page} / {pageCount} 页
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(Math.max(page - 1, 1))}
                        disabled={page <= 1}
                        className="inline-flex h-8 flex-row items-center justify-center whitespace-nowrap rounded-md border-border px-3 text-secondary-foreground hover:bg-accent"
                    >
                        上一页
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(Math.min(page + 1, pageCount))}
                        disabled={page >= pageCount}
                        className="inline-flex h-8 flex-row items-center justify-center whitespace-nowrap rounded-md border-border px-3 text-secondary-foreground hover:bg-accent"
                    >
                        下一页
                    </Button>
                    <div className="flex items-center gap-2 pl-1">
                        <label htmlFor={jumpId}>前往</label>
                        <Input
                            id={jumpId}
                            aria-label="页码"
                            inputMode="numeric"
                            value={String(page)}
                            onChange={(event) => {
                                const next = Number(event.target.value);
                                if (!Number.isFinite(next)) return;
                                onPageChange(Math.min(Math.max(Math.floor(next), 1), pageCount));
                            }}
                            className="h-8 w-16 rounded-md text-center text-sm"
                        />
                        <span>页</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
