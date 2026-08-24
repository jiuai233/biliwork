"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SizeSegment } from "@/components/shared/ListPager";

interface RankingLimitControlProps {
    value: number;
}

const quickOptions = [10, 20, 50, 100] as const;

export function RankingLimitControl({ value }: RankingLimitControlProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const applyLimit = (nextLimit: number) => {
        const safeLimit = Math.min(Math.max(Math.floor(nextLimit), 1), 100);
        const params = new URLSearchParams(searchParams);
        params.set("limit", String(safeLimit));
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div
            data-testid="ranking-limit-control"
            className="relative z-10 flex w-full shrink-0 justify-end border-t border-border bg-card px-4 py-3 text-sm text-secondary-foreground"
        >
            <SizeSegment
                className="ms-auto"
                value={value}
                options={quickOptions}
                onChange={applyLimit}
                label="每页"
                unit="位"
            />
        </div>
    );
}
