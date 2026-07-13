"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AnalyticsDateRangePicker, type DateRange } from "@/components/dashboard/AnalyticsDateRangePicker";
import { formatDateParam, parseDateParam } from "@/lib/date-params";

interface AnalyticsDateFilterProps {
    from: string;
    to: string;
}

function parseDate(value: string): Date {
    return parseDateParam(value) ?? new Date();
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

    return (
        <AnalyticsDateRangePicker
            date={dateRange}
            setDate={setDateRange}
            onApply={applyDateRange}
            pending={isPending}
        />
    );
}
