"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

interface RankingLimitControlProps {
    value: number;
}

const quickOptions = [10, 20, 50, 100];

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
        <div data-testid="ranking-limit-control" className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">显示</span>
            <div className="flex h-9 overflow-hidden rounded-lg border border-border bg-muted/40">
                {quickOptions.map((option) => (
                    <Button
                        key={option}
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => applyLimit(option)}
                        className={[
                            "inline-flex h-9 items-center rounded-none border-r border-border px-3 text-sm last:border-r-0",
                            value === option
                                ? "bg-primary text-white"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground",
                        ].join(" ")}
                    >
                        {option}
                    </Button>
                ))}
            </div>
        </div>
    );
}
