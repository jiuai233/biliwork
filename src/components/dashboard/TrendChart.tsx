'use client';

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { SectionCard } from "@/components/shared/SectionCard";
import { Tabs, Tab, TabList, TabPanel } from "@/components/shared/tabs";
import { formatCurrency } from "@/lib/format";
import type { TrendPoint } from "@/lib/services/analytics";

interface TrendChartProps {
    points: TrendPoint[];
}

/** 'YYYY-MM-DD HH:00' → 'MM-DD 14时'；'YYYY-MM-DD' → 'MM-DD' */
function shortLabel(label: string) {
    const [datePart, timePart] = label.split(" ");
    const d = datePart.slice(5);
    return timePart ? `${d} ${timePart.slice(0, 2)}时` : d;
}

export function TrendChart({ points }: TrendChartProps) {
    const [series, setSeries] = useState<"danmaku" | "income">("danmaku");
    const isIncome = series === "income";
    const color = isIncome ? "var(--money)" : "var(--chart-1)";

    const values = points.map((p) => (isIncome ? p.income : p.danmaku));
    const max = Math.max(...values, 1);
    const total = values.reduce((a, b) => a + b, 0);
    const midIndex = Math.floor(points.length / 2);
    const fmt = (v: number) => (isIncome ? formatCurrency(v) : `${v.toLocaleString()} 条`);

    return (
        <Tabs
            selectedKey={series}
            onSelectionChange={(key) => setSeries(String(key) as "danmaku" | "income")}
        >
            <SectionCard
                className="min-h-[220px]"
                title="数据趋势"
                icon={<TrendingUp className="h-5 w-5 text-primary" />}
                actions={
                    <TabList aria-label="趋势类型切换">
                        <Tab id="danmaku">弹幕</Tab>
                        <Tab id="income">营收</Tab>
                    </TabList>
                }
            >
                <TabPanel id="danmaku" className="p-3">
                    <ChartBody />
                </TabPanel>
                <TabPanel id="income" className="p-3">
                    <ChartBody />
                </TabPanel>
            </SectionCard>
        </Tabs>
    );

    function ChartBody() {
        const hasData = values.some((v) => v > 0);
        if (points.length === 0 || !hasData) {
            return <div className="flex h-[140px] items-center justify-center text-sm text-muted-foreground">所选范围内暂无数据</div>;
        }
        return (
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1 text-xs text-muted-foreground tabular-nums">
                    <span>{isIncome ? `累计营收 ${formatCurrency(total)}` : `累计弹幕 ${total.toLocaleString()} 条`}</span>
                    <span>峰值 {fmt(max)}</span>
                </div>
                <div className="flex h-[140px] items-end gap-[2px]">
                    {points.map((p, i) => (
                        <div
                            key={p.ts}
                            title={`${shortLabel(p.label)}：${fmt(values[i])}`}
                            className="group min-w-0 flex-1"
                        >
                            <div
                                className="w-full rounded-sm transition-opacity group-hover:opacity-80"
                                style={{
                                    height: `${(values[i] / max) * 100}%`,
                                    backgroundColor: color,
                                }}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex justify-between px-1 text-[10px] text-muted-foreground">
                    <span>{shortLabel(points[0].label)}</span>
                    {points.length > 2 && <span>{shortLabel(points[midIndex].label)}</span>}
                    <span>{shortLabel(points[points.length - 1].label)}</span>
                </div>
            </div>
        );
    }
}
