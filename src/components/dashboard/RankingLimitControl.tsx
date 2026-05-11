"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RankingLimitControlProps {
    value: number;
}

const quickOptions = [10, 20, 50, 100];

export function RankingLimitControl({ value }: RankingLimitControlProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [input, setInput] = React.useState(String(value));

    React.useEffect(() => {
        setInput(String(value));
    }, [value]);

    const applyLimit = React.useCallback((nextLimit: number) => {
        const safeLimit = Math.min(Math.max(Math.floor(nextLimit), 1), 100);
        const params = new URLSearchParams(searchParams);
        params.set("limit", String(safeLimit));
        router.push(`${pathname}?${params.toString()}`);
    }, [pathname, router, searchParams]);

    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-400">显示数量</span>
            <div className="flex h-10 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                {quickOptions.map((option) => (
                    <Button
                        key={option}
                        type="button"
                        size="sm"
                        variant={value === option ? "default" : "ghost"}
                        onClick={() => applyLimit(option)}
                        className="inline-flex h-10 items-center justify-center rounded-none border-r border-white/10 px-3 text-sm last:border-r-0"
                    >
                        {option}
                    </Button>
                ))}
            </div>
            <Input
                value={input}
                inputMode="numeric"
                onChange={(event) => setInput(event.target.value.replace(/[^\d]/g, ""))}
                onKeyDown={(event) => {
                    if (event.key === "Enter") applyLimit(Number(input || value));
                }}
                className="h-10 w-20 rounded-xl border border-white/10 bg-white/[0.04] text-center text-sm text-white hover:bg-white/[0.06]"
            />
            <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => applyLimit(Number(input || value))}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 px-4 text-sm text-slate-200 hover:bg-white/[0.06]"
            >
                应用
            </Button>
        </div>
    );
}
