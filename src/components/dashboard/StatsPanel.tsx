'use client';

import { DashboardStats } from "@/lib/types";
import { MessageSquare, Gift, Shield, MessageSquareHeart, CreditCard } from "lucide-react";
import { StatCard, type StatTone } from "@/components/shared/StatCard";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface StatsPanelProps {
    stats: DashboardStats;
    previousStats?: DashboardStats | null;
}

function Delta({ current, previous, isCurrency }: { current: number; previous: number | undefined; isCurrency?: boolean }) {
    if (previous === undefined) return <span>较昨日 --</span>;

    const delta = Number((current - previous).toFixed(isCurrency ? 2 : 0));
    if (delta === 0) return <span>较昨日 持平</span>;

    const up = delta > 0;
    const abs = isCurrency ? formatCurrency(Math.abs(delta)) : Math.abs(delta).toLocaleString();
    const percent = previous > 0 ? ` (${up ? "+" : "-"}${Math.abs((delta / previous) * 100).toFixed(0)}%)` : "";

    return (
        <span>
            较昨日{" "}
            <span className={cn("font-semibold", up ? "text-emerald-400" : "text-red-400")}>
                {up ? "↑" : "↓"} {abs}{percent}
            </span>
        </span>
    );
}

export function StatsPanel({ stats, previousStats }: StatsPanelProps) {
    const items: {
        label: string;
        value: string;
        current: number;
        previous: number | undefined;
        isCurrency?: boolean;
        icon: React.ReactNode;
        tone: StatTone;
    }[] = [
        {
            label: "弹幕",
            value: stats.danmakuCount.toLocaleString(),
            current: stats.danmakuCount,
            previous: previousStats?.danmakuCount,
            icon: <MessageSquare className="h-3.5 w-3.5" />,
            tone: "sky",
        },
        {
            label: "礼物",
            value: stats.giftCount.toLocaleString(),
            current: stats.giftCount,
            previous: previousStats?.giftCount,
            icon: <Gift className="h-3.5 w-3.5" />,
            tone: "pink",
        },
        {
            label: "SC",
            value: stats.scCount.toLocaleString(),
            current: stats.scCount,
            previous: previousStats?.scCount,
            icon: <MessageSquareHeart className="h-3.5 w-3.5" />,
            tone: "amber",
        },
        {
            label: "上舰",
            value: stats.guardCount.toLocaleString(),
            current: stats.guardCount,
            previous: previousStats?.guardCount,
            icon: <Shield className="h-3.5 w-3.5" />,
            tone: "indigo",
        },
        {
            label: "预计营收",
            value: formatCurrency(stats.totalIncome),
            current: stats.totalIncome,
            previous: previousStats?.totalIncome,
            isCurrency: true,
            icon: <CreditCard className="h-3.5 w-3.5" />,
            tone: "emerald",
        },
    ];

    return (
        <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {items.map(({ label, value, current, previous, isCurrency, icon, tone }) => (
                <StatCard
                    key={label}
                    label={label}
                    value={value}
                    icon={icon}
                    tone={tone}
                    delta={<Delta current={current} previous={previous} isCurrency={isCurrency} />}
                />
            ))}
        </div>
    );
}
