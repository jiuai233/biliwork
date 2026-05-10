"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { Button } from "@heroui/react";
import { Loader2, RotateCcw, Search } from "lucide-react";

import { AnalyticsDateRangePicker } from "@/components/dashboard/AnalyticsDateRangePicker";

interface AnalyticsDateFilterProps {
    from: string;
    to: string;
}

function parseDate(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function formatDateParam(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function AnalyticsDateFilter({ from, to }: AnalyticsDateFilterProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = React.useTransition();
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
        from: parseDate(from),
        to: parseDate(to),
    });

    React.useEffect(() => {
        setDateRange({
            from: parseDate(from),
            to: parseDate(to),
        });
    }, [from, to]);

    const applyDateRange = React.useCallback((range: DateRange | undefined) => {
        const nextFrom = range?.from ?? new Date();
        const nextTo = range?.to ?? nextFrom;
        const params = new URLSearchParams(searchParams);
        params.set("from", formatDateParam(nextFrom));
        params.set("to", formatDateParam(nextTo));

        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    }, [pathname, router, searchParams]);

    const resetToday = React.useCallback(() => {
        const today = new Date();
        const nextRange = { from: today, to: today };
        setDateRange(nextRange);
        applyDateRange(nextRange);
    }, [applyDateRange]);

    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <AnalyticsDateRangePicker date={dateRange} setDate={setDateRange} />
            <div className="flex shrink-0 gap-2">
                <Button
                    type="button"
                    onClick={() => applyDateRange(dateRange)}
                    isDisabled={isPending}
                    size="sm"
                    variant="primary"
                    className="inline-flex h-10 min-w-[84px] flex-row items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4"
                >
                    {isPending ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    ) : (
                        <Search className="h-4 w-4 shrink-0" />
                    )}
                    查询
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetToday}
                    isDisabled={isPending}
                    className="inline-flex h-10 min-w-[78px] flex-row items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-white/[0.04] px-4 text-zinc-200 hover:bg-white/[0.08]"
                >
                    <RotateCcw className="h-4 w-4 shrink-0" />
                    今天
                </Button>
            </div>
        </div>
    );
}
