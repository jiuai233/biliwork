'use client';

import { type ReactNode } from "react";
import { RankingList } from "@/components/dashboard/RankingList";
import { Gift, MessageSquareText } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface StatsChartsProps {
    danmakuTop: { uname: string; count: number; uface: string }[];
    giftTop: { uname: string; total: number; uface: string }[];
    className?: string;
    footer?: ReactNode;
}

export function StatsCharts({ danmakuTop, giftTop, className, footer }: StatsChartsProps) {
    const giftItems = giftTop.map((item) => ({
        uname: item.uname,
        uface: item.uface,
        value: item.total,
        label: formatCurrency(item.total),
    }));
    const danmakuItems = danmakuTop.map((item) => ({
        uname: item.uname,
        uface: item.uface,
        value: item.count,
        label: `${item.count.toLocaleString()} 条`,
    }));

    const giftTotal = giftItems.reduce((sum, item) => sum + item.value, 0);
    const danmakuTotal = danmakuItems.reduce((sum, item) => sum + item.value, 0);

    return (
        <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden gap-4", className)}>
            {/* Dual Columns Grid on Desktop */}
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2 overflow-hidden">
                {/* Left Card: 礼物贡献榜 */}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-3 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                <Gift className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-foreground">礼物贡献榜</h3>
                                <p className="text-[11px] text-muted-foreground">统计所选区间内送礼总额排行</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-bold font-mono text-money">
                                累计 {formatCurrency(giftTotal)}
                            </span>
                            <div className="text-[10px] text-muted-foreground">
                                上榜 {giftItems.length} 位用户
                            </div>
                        </div>
                    </div>

                    {/* List */}
                    <RankingList
                        items={giftItems}
                        tone="amber"
                        emptyTitle="暂无礼物贡献记录"
                    />
                </div>

                {/* Right Card: 弹幕活跃榜 */}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-3 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 border border-sky-500/20">
                                <MessageSquareText className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-foreground">弹幕活跃榜</h3>
                                <p className="text-[11px] text-muted-foreground">统计所选区间内发送弹幕次数排行</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-bold font-mono text-sky-500">
                                累计 {danmakuTotal.toLocaleString()} 条
                            </span>
                            <div className="text-[10px] text-muted-foreground">
                                上榜 {danmakuItems.length} 位用户
                            </div>
                        </div>
                    </div>

                    {/* List */}
                    <RankingList
                        items={danmakuItems}
                        tone="sky"
                        emptyTitle="暂无弹幕互动记录"
                    />
                </div>
            </div>

            {/* Bottom Footer Control */}
            {footer && (
                <div className="shrink-0 overflow-hidden rounded-xl border border-border bg-card">
                    {footer}
                </div>
            )}
        </div>
    );
}
