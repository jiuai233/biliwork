
'use client';

import { DashboardStats } from "@/lib/types";
import { MessageSquare, Gift, Shield, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsPanelProps {
    stats: DashboardStats;
    previousStats?: DashboardStats | null;
}

type StatKey = "danmakuCount" | "giftCount" | "guardCount" | "totalIncome";

function formatDelta(current: number, previous: number | undefined, isCurrency = false) {
    if (previous === undefined) return "较昨日 --";

    const delta = Number((current - previous).toFixed(isCurrency ? 2 : 0));
    if (delta === 0) return "较昨日 持平";

    const sign = delta > 0 ? "+" : "";
    const value = isCurrency ? `¥${Math.abs(delta).toFixed(1)}` : Math.abs(delta).toLocaleString();

    return `较昨日 ${sign}${delta < 0 ? "-" : ""}${value}`;
}

export function StatsPanel({ stats, previousStats }: StatsPanelProps) {
    const items = [
        {
            label: "今日弹幕",
            value: stats.danmakuCount,
            statKey: "danmakuCount" as StatKey,
            icon: MessageSquare,
            labelClass: "text-sky-300",
            iconClass: "text-sky-300 bg-sky-500/15 shadow-sky-500/20",
            cardClass: "from-sky-500/10 via-slate-950/80 to-slate-950",
        },
        {
            label: "今日礼物",
            value: stats.giftCount,
            statKey: "giftCount" as StatKey,
            icon: Gift,
            labelClass: "text-pink-300",
            iconClass: "text-pink-300 bg-pink-500/15 shadow-pink-500/20",
            cardClass: "from-pink-500/10 via-slate-950/80 to-slate-950",
        },
        {
            label: "今日上舰",
            value: stats.guardCount,
            statKey: "guardCount" as StatKey,
            icon: Shield,
            labelClass: "text-indigo-300",
            iconClass: "text-indigo-300 bg-indigo-500/15 shadow-indigo-500/20",
            cardClass: "from-indigo-500/10 via-slate-950/80 to-slate-950",
        },
        {
            label: "预计营收 (SC)",
            value: `¥${stats.totalIncome}`,
            statKey: "totalIncome" as StatKey,
            isCurrency: true,
            icon: CreditCard,
            labelClass: "text-emerald-300",
            iconClass: "text-emerald-300 bg-emerald-500/15 shadow-emerald-500/20",
            cardClass: "from-emerald-500/15 via-slate-950/80 to-slate-950",
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {items.map(({ label, value, statKey, isCurrency, icon: Icon, labelClass, iconClass, cardClass }) => (
                <section
                    key={label}
                    className={cn(
                        "relative min-h-[104px] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br p-4 shadow-[0_14px_40px_rgba(0,0,0,0.18)]",
                        cardClass
                    )}
                >
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_14%,rgba(255,255,255,0.08),transparent_34%)]" />
                    <div className="relative flex items-start justify-between">
                        <p className={cn("text-sm font-semibold", labelClass)}>{label}</p>
                        <div className={cn("rounded-lg p-1.5 shadow-lg", iconClass)}>
                            <Icon className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="relative mt-3">
                        <div className="text-2xl font-black tracking-normal text-white md:text-3xl">{value}</div>
                        <p className="mt-1 text-xs text-slate-400">
                            {formatDelta(Number(stats[statKey]), previousStats?.[statKey], isCurrency)}
                        </p>
                    </div>
                </section>
            ))}
        </div>
    );
}
