
'use client';

import { DashboardStats } from "@/lib/types";
import { MessageSquare, Gift, Shield, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsPanelProps {
    stats: DashboardStats;
}

export function StatsPanel({ stats }: StatsPanelProps) {
    const items = [
        {
            label: "今日弹幕",
            value: stats.danmakuCount,
            icon: MessageSquare,
            labelClass: "text-sky-300",
            iconClass: "text-sky-300 bg-sky-500/15 shadow-sky-500/20",
            cardClass: "from-sky-500/10 via-slate-950/80 to-slate-950",
        },
        {
            label: "今日礼物",
            value: stats.giftCount,
            icon: Gift,
            labelClass: "text-pink-300",
            iconClass: "text-pink-300 bg-pink-500/15 shadow-pink-500/20",
            cardClass: "from-pink-500/10 via-slate-950/80 to-slate-950",
        },
        {
            label: "今日上舰",
            value: stats.guardCount,
            icon: Shield,
            labelClass: "text-indigo-300",
            iconClass: "text-indigo-300 bg-indigo-500/15 shadow-indigo-500/20",
            cardClass: "from-indigo-500/10 via-slate-950/80 to-slate-950",
        },
        {
            label: "预计营收 (SC)",
            value: `¥${stats.totalIncome}`,
            icon: CreditCard,
            labelClass: "text-emerald-300",
            iconClass: "text-emerald-300 bg-emerald-500/15 shadow-emerald-500/20",
            cardClass: "from-emerald-500/15 via-slate-950/80 to-slate-950",
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {items.map(({ label, value, icon: Icon, labelClass, iconClass, cardClass }) => (
                <section
                    key={label}
                    className={cn(
                        "relative min-h-[136px] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br p-6 shadow-[0_20px_60px_rgba(0,0,0,0.20)]",
                        cardClass
                    )}
                >
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_14%,rgba(255,255,255,0.08),transparent_34%)]" />
                    <div className="relative flex items-start justify-between">
                        <p className={cn("text-sm font-semibold", labelClass)}>{label}</p>
                        <div className={cn("rounded-xl p-2 shadow-lg", iconClass)}>
                            <Icon className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="relative mt-5">
                        <div className="text-4xl font-black tracking-normal text-white">{value}</div>
                        <p className="mt-3 text-sm text-slate-400">较昨日 --</p>
                    </div>
                </section>
            ))}
        </div>
    );
}
