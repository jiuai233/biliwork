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
    tone?: "amber" | "sky";
    emptyTitle?: string;
    className?: string;
}

export function RankingList({ items, tone = "amber", emptyTitle = "暂无排行数据", className }: RankingListProps) {
    const maxValue = Math.max(...items.map((item) => item.value), 1);

    return (
        <div className={cn("dark-scrollbar min-h-0 flex-1 overflow-y-auto p-3 space-y-2", className)}>
            {items.map((item, index) => {
                const percent = Math.max(4, Math.round((item.value / maxValue) * 100));
                const name = item.uname || "匿名用户";
                const isFirst = index === 0;
                const isSecond = index === 1;
                const isThird = index === 2;

                return (
                    <div
                        key={`${item.uname}-${index}`}
                        className={cn(
                            "group relative overflow-hidden rounded-xl border px-3.5 py-2.5 transition-all",
                            isFirst
                                ? "border-amber-500/30 bg-amber-500/[0.04] hover:bg-amber-500/[0.08]"
                                : isSecond
                                ? "border-slate-400/25 bg-slate-500/[0.03] hover:bg-slate-500/[0.06]"
                                : isThird
                                ? "border-orange-500/20 bg-orange-500/[0.02] hover:bg-orange-500/[0.05]"
                                : "border-border/60 bg-card hover:border-border hover:bg-accent/40"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            {/* Rank Badge */}
                            <div className="flex w-7 shrink-0 items-center justify-center">
                                {isFirst ? (
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-xs font-black text-amber-500 ring-1 ring-amber-500/40">
                                        1
                                    </span>
                                ) : isSecond ? (
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-400/20 text-xs font-black text-slate-400 ring-1 ring-slate-400/40">
                                        2
                                    </span>
                                ) : isThird ? (
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/20 text-xs font-black text-orange-500 ring-1 ring-orange-500/40">
                                        3
                                    </span>
                                ) : (
                                    <span className="font-mono text-xs font-bold text-muted-foreground/70">
                                        {index + 1}
                                    </span>
                                )}
                            </div>

                            {/* Avatar */}
                            <Avatar
                                src={item.uface}
                                name={item.uname}
                                className={cn(
                                    "h-8 w-8 shrink-0 border",
                                    isFirst ? "border-amber-500/40 ring-2 ring-amber-500/20" : "border-border"
                                )}
                            />

                            {/* Name & Bar & Value */}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                    <span
                                        className={cn(
                                            "truncate text-xs font-semibold",
                                            isFirst ? "text-foreground font-bold" : "text-foreground/90"
                                        )}
                                        title={name}
                                    >
                                        {name}
                                    </span>
                                    <span
                                        className={cn(
                                            "shrink-0 font-mono text-xs font-bold",
                                            tone === "amber" ? "text-money" : "text-sky-500"
                                        )}
                                    >
                                        {item.label}
                                    </span>
                                </div>

                                {/* Relative Proportion Bar */}
                                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted/60">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-300",
                                            isFirst
                                                ? tone === "amber" ? "bg-amber-500" : "bg-sky-500"
                                                : tone === "amber" ? "bg-amber-500/40" : "bg-sky-500/40"
                                        )}
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            {items.length === 0 && (
                <EmptyState
                    title={emptyTitle}
                    description="所选时间段内暂无活跃数据，请尝试调整筛选日期。"
                    className="min-h-[260px]"
                />
            )}
        </div>
    );
}
