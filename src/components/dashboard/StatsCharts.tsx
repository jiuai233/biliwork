'use client';

import { useMemo, useState } from "react";
import { Avatar, Button, Card } from "@heroui/react";
import { Gift, MessageSquareText, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsChartsProps {
    danmakuTop: { uname: string; count: number; uface: string }[];
    giftTop: { uname: string; total: number; uface: string }[];
    className?: string;
}

type RankingTab = "danmaku" | "gift";

function formatCurrency(value: number) {
    return new Intl.NumberFormat("zh-CN", {
        style: "currency",
        currency: "CNY",
        maximumFractionDigits: 1,
    }).format(value);
}

function normalizeAvatarSrc(src: string | null | undefined): string | undefined {
    if (!src) return undefined;
    if (src.startsWith("//")) return `https:${src}`;
    if (src.startsWith("http://")) return src.replace(/^http:\/\//, "https://");
    return src;
}

function rankClass(index: number) {
    if (index === 0) return "border-amber-400/30 bg-amber-400/10 text-amber-200";
    if (index === 1) return "border-sky-300/25 bg-sky-300/10 text-sky-200";
    if (index === 2) return "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-200";
    return "border-white/10 bg-white/[0.04] text-slate-300";
}

export function StatsCharts({ danmakuTop, giftTop, className }: StatsChartsProps) {
    const [activeTab, setActiveTab] = useState<RankingTab>("danmaku");
    const activeData = activeTab === "danmaku"
        ? danmakuTop.map((item) => ({ uname: item.uname, uface: item.uface, value: item.count, label: `${item.count} 条` }))
        : giftTop.map((item) => ({ uname: item.uname, uface: item.uface, value: item.total, label: formatCurrency(item.total) }));

    const maxValue = useMemo(() => Math.max(...activeData.map((item) => item.value), 1), [activeData]);
    const totalValue = activeData.reduce((sum, item) => sum + item.value, 0);

    return (
        <Card
            variant="secondary"
            className={cn(
                "min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(124,58,237,0.16),transparent_34%),rgba(2,6,23,0.78)]",
                className
            )}
        >
            <div className="flex h-full min-h-0 flex-col">
                <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                            <Trophy className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="text-lg font-extrabold text-white">
                                {activeTab === "danmaku" ? "弹幕活跃榜" : "礼物贡献榜"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                                共 {activeData.length} 位用户，{activeTab === "danmaku" ? `累计 ${totalValue} 条弹幕` : `累计 ${formatCurrency(totalValue)}`}
                            </div>
                        </div>
                    </div>

                    <div className="flex h-10 gap-1 rounded-xl border border-white/10 bg-black/20 p-1">
                        <Button
                            type="button"
                            size="sm"
                            variant={activeTab === "danmaku" ? "primary" : "ghost"}
                            onClick={() => setActiveTab("danmaku")}
                            className={cn(
                                "inline-flex h-8 items-center justify-center gap-2 rounded-lg px-3 text-sm",
                                activeTab === "danmaku" ? "text-white" : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                            )}
                        >
                            <MessageSquareText className="h-4 w-4" />
                            弹幕榜
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={activeTab === "gift" ? "primary" : "ghost"}
                            onClick={() => setActiveTab("gift")}
                            className={cn(
                                "inline-flex h-8 items-center justify-center gap-2 rounded-lg px-3 text-sm",
                                activeTab === "gift" ? "text-white" : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                            )}
                        >
                            <Gift className="h-4 w-4" />
                            礼物榜
                        </Button>
                    </div>
                </div>

                <div className="dark-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    <div className="space-y-3 pr-1">
                        {activeData.map((item, index) => {
                            const percent = Math.max(4, Math.round((item.value / maxValue) * 100));
                            return (
                                <div
                                    key={`${item.uname}-${index}`}
                                    className={cn(
                                        "min-h-[78px] rounded-2xl border px-4 py-3 transition hover:bg-white/[0.045]",
                                        rankClass(index)
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/20 text-sm font-black">
                                            #{index + 1}
                                        </div>
                                        <Avatar className="h-11 w-11 shrink-0 border border-white/10">
                                            <Avatar.Image src={normalizeAvatarSrc(item.uface)} referrerPolicy="no-referrer" />
                                            <Avatar.Fallback>{item.uname?.[0] ?? "?"}</Avatar.Fallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="truncate font-bold text-white">{item.uname || "匿名用户"}</div>
                                                <div className={cn(
                                                    "shrink-0 font-mono text-sm font-bold",
                                                    index === 0 ? "text-amber-200" : "text-white"
                                                )}>{item.label}</div>
                                            </div>
                                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full",
                                                        activeTab === "danmaku" ? "bg-blue-400" : "bg-pink-400"
                                                    )}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {activeData.length === 0 && (
                            <div className="flex min-h-[420px] items-center justify-center text-sm text-slate-500">
                                暂无数据
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
