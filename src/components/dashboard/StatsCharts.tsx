'use client';

import { useState } from "react";
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsChartsProps {
    danmakuTop: { uname: string; count: number; uface: string }[];
    giftTop: { uname: string; total: number; uface: string }[];
}

export function StatsCharts({ danmakuTop, giftTop }: StatsChartsProps) {
    const [activeTab, setActiveTab] = useState<'danmaku' | 'gift'>('danmaku');

    // Custom Tick for Y-Axis (User Avatar + Name)
    const renderCustomAxisTick = ({ x, y, payload, data }: any) => {
        const item = data[payload.index];
        if (!item) return null;
        return (
            <g transform={`translate(${x},${y})`}>
                <foreignObject x={-140} y={-15} width={130} height={30}>
                    <div className="flex items-center justify-end gap-2 h-full pr-2">
                        <span className="text-xs text-zinc-300 truncate max-w-[80px] text-right" title={item.uname}>
                            {item.uname}
                        </span>
                        <img
                            src={item.uface ?? undefined}
                            alt={item.uname}
                            className="w-5 h-5 rounded-full border border-zinc-700 object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                    </div>
                </foreignObject>
            </g>
        );
    };

    const CustomTooltip = ({ active, payload, label, unit }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-zinc-900 border border-zinc-800 p-2 rounded shadow-lg text-xs">
                    <p className="font-semibold text-zinc-200">{payload[0].payload.uname}</p>
                    <p className="text-zinc-400">
                        {unit === '条' ? '弹幕数: ' : '贡献值: '}
                        <span className="text-white font-mono font-bold">{payload[0].value}</span>
                        {unit}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="h-[250px] bg-zinc-900/40 border-zinc-800 flex flex-col">
            <div className="flex-1 flex flex-col w-full h-full">
                <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-zinc-800/50">
                    <div className="h-8 bg-zinc-900/50 p-1 rounded-sm flex gap-1">
                        <button
                            onClick={() => setActiveTab('danmaku')}
                            className={cn(
                                "text-xs px-3 rounded-sm transition-all",
                                activeTab === 'danmaku' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            弹幕榜
                        </button>
                        <button
                            onClick={() => setActiveTab('gift')}
                            className={cn(
                                "text-xs px-3 rounded-sm transition-all",
                                activeTab === 'gift' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            礼物榜
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-h-0 w-full p-2 relative">
                    {activeTab === 'danmaku' && (
                        <div className="h-full w-full mt-0 absolute inset-0 p-2">
                            {danmakuTop.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={danmakuTop} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <XAxis type="number" hide />
                                        <YAxis
                                            type="category"
                                            dataKey="uname"
                                            width={140}
                                            tick={(props) => renderCustomAxisTick({ ...props, data: danmakuTop })}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip content={<CustomTooltip unit="条" />} cursor={{ fill: '#ffffff0a' }} />
                                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                                            {danmakuTop.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#3b82f6', '#60a5fa', '#93c5fd'][index % 3]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-zinc-600 text-xs">暂无数据</div>
                            )}
                        </div>
                    )}

                    {activeTab === 'gift' && (
                        <div className="h-full w-full mt-0 absolute inset-0 p-2">
                            {giftTop.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={giftTop} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <XAxis type="number" hide />
                                        <YAxis
                                            type="category"
                                            dataKey="uname"
                                            width={140}
                                            tick={(props) => renderCustomAxisTick({ ...props, data: giftTop })}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip content={<CustomTooltip unit="元" />} cursor={{ fill: '#ffffff0a' }} />
                                        <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={16}>
                                            {giftTop.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#ec4899', '#f472b6', '#fbcfe8'][index % 3]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-zinc-600 text-xs">暂无数据</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}
