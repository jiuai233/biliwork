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

const W = 640;
const H = 200;
const PAD = { top: 18, right: 10, bottom: 24, left: 10 };

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
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
    const x = (i: number) => PAD.left + i * stepX;
    const y = (v: number) => PAD.top + innerH * (1 - v / max);

    const line = points
        .map((_, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(values[i]).toFixed(1)}`)
        .join(" ");
    const area = `${line} L${x(points.length - 1).toFixed(1)},${PAD.top + innerH} L${PAD.left},${PAD.top + innerH} Z`;

    const showDots = points.length <= 40;
    const midIndex = Math.floor(points.length / 2);
    const fmt = (v: number) => (isIncome ? formatCurrency(v) : `${v.toLocaleString()} 条`);

    return (
        <Tabs
            selectedKey={series}
            onSelectionChange={(key) => setSeries(String(key) as "danmaku" | "income")}
        >
            <SectionCard
                className="min-h-[280px]"
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
        if (points.length === 0) {
            return <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">所选范围内暂无数据</div>;
        }
        return (
            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between px-1 text-xs text-muted-foreground tabular-nums">
                    <span>{isIncome ? `累计营收 ${formatCurrency(total)}` : `累计弹幕 ${total.toLocaleString()} 条`}</span>
                    <span>峰值 {fmt(max)}</span>
                </div>
                <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={isIncome ? "营收趋势图" : "弹幕趋势图"}>
                    <defs>
                        <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                            <stop offset="100%" stopColor={color} stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {[0.25, 0.5, 0.75, 1].map((f) => (
                        <line
                            key={f}
                            x1={PAD.left}
                            x2={W - PAD.right}
                            y1={PAD.top + innerH * (1 - f)}
                            y2={PAD.top + innerH * (1 - f)}
                            stroke="var(--border)"
                            strokeWidth="1"
                        />
                    ))}
                    <path d={area} fill="url(#trend-fill)" />
                    <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                    {showDots &&
                        points.map((p, i) => (
                            <circle key={p.ts} cx={x(i)} cy={y(values[i])} r="2.5" fill={color}>
                                <title>{`${shortLabel(p.label)}：${fmt(values[i])}`}</title>
                            </circle>
                        ))}
                    <text x={PAD.left} y={H - 6} fontSize="10" fill="var(--muted-foreground)">
                        {shortLabel(points[0].label)}
                    </text>
                    {points.length > 2 && (
                        <text x={x(midIndex)} y={H - 6} fontSize="10" textAnchor="middle" fill="var(--muted-foreground)">
                            {shortLabel(points[midIndex].label)}
                        </text>
                    )}
                    <text x={W - PAD.right} y={H - 6} fontSize="10" textAnchor="end" fill="var(--muted-foreground)">
                        {shortLabel(points[points.length - 1].label)}
                    </text>
                </svg>
            </div>
        );
    }
}
