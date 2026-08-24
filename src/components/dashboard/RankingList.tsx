'use client';

import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

export interface RankingItem {
    uname: string;
    uface: string;
    value: number;
    label: string;
}

interface RankingListProps {
    items: RankingItem[];
    totalLabel?: string;
    className?: string;
}

export function RankingList({ items, totalLabel, className }: RankingListProps) {
    const maxValue = Math.max(...items.map((item) => item.value), 1);

    return (
        <div className={cn("dark-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-2 pb-6", className)}>
            <div className="space-y-1">
                {items.map((item, index) => {
                    const percent = Math.max(4, Math.round((item.value / maxValue) * 100));
                    const name = item.uname || "匿名用户";
                    return (
                        <div key={`${item.uname}-${index}`} className="rounded-lg border border-border bg-accent/30 px-2.5 py-1.5">
                            <div className="flex items-center gap-2.5">
                                <span className="w-7 shrink-0 text-center text-[11px] font-black text-muted-foreground tabular-nums">
                                    #{index + 1}
                                </span>
                                <Avatar src={item.uface} name={item.uname} className="h-6 w-6" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="truncate text-[13px] font-semibold text-foreground" title={name}>{name}</div>
                                        <div className="shrink-0 text-xs font-bold text-foreground tabular-nums">{item.label}</div>
                                    </div>
                                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-background/40">
                                        <div className={cn("h-full rounded-full", index === 0 ? "bg-primary" : "bg-foreground/15")} style={{ width: `${percent}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {items.length === 0 && (
                    <EmptyState
                        title="这段时间没有排行数据"
                        description="换个日期范围再看。"
                        className="min-h-[300px]"
                    />
                )}
            </div>
            {items.length > 0 && totalLabel && (
                <p className="mt-3 text-center text-xs text-muted-foreground">{totalLabel}</p>
            )}
        </div>
    );
}
