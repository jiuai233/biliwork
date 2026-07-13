'use client';

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface RankingItem {
    uname: string;
    uface: string;
    value: number;
    label: string;
}

function rankClass(index: number) {
    if (index === 0) return "border-amber-500/30 bg-amber-500/10";
    if (index === 1) return "border-sky-400/25 bg-sky-400/10";
    if (index === 2) return "border-fuchsia-400/25 bg-fuchsia-400/10";
    return "border-border bg-accent/30";
}

interface RankingListProps {
    items: RankingItem[];
    barClass: string;
    totalLabel?: string;
    className?: string;
}

export function RankingList({ items, barClass, totalLabel, className }: RankingListProps) {
    const maxValue = Math.max(...items.map((item) => item.value), 1);

    return (
        <div className={cn("dark-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-2", className)}>
            <div className="space-y-1">
                {items.map((item, index) => {
                    const percent = Math.max(4, Math.round((item.value / maxValue) * 100));
                    return (
                        <div key={`${item.uname}-${index}`} className={cn("rounded-lg border px-2.5 py-1.5", rankClass(index))}>
                            <div className="flex items-center gap-2.5">
                                <span className="w-7 shrink-0 text-center text-[11px] font-black text-muted-foreground tabular-nums">
                                    #{index + 1}
                                </span>
                                <Avatar src={item.uface} name={item.uname} className="h-6 w-6" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="truncate text-[13px] font-semibold text-foreground">{item.uname || "匿名用户"}</div>
                                        <div className="shrink-0 text-xs font-bold text-foreground tabular-nums">{item.label}</div>
                                    </div>
                                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-background/40">
                                        <div className={cn("h-full rounded-full", barClass)} style={{ width: `${percent}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {items.length === 0 && (
                    <div className="flex min-h-[300px] items-center justify-center text-sm text-muted-foreground">暂无数据</div>
                )}
            </div>
            {items.length > 0 && totalLabel && (
                <p className="mt-3 text-center text-xs text-muted-foreground">{totalLabel}</p>
            )}
        </div>
    );
}
