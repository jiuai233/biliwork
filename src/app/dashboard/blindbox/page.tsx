'use client';

import { useEffect, useState } from "react";
import { getBlindboxData } from "./actions";
import { Broadcaster } from "@/lib/types";
import { BlindboxStats, BlindboxRecord, GiftDistribution, BLINDBOX_COST } from "@/lib/types";
import { Loader2, RefreshCcw, TrendingUp, TrendingDown, Box, Coins, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { startOfDay, endOfDay } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";


export default function BlindboxPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{
        broadcaster: Broadcaster | null;
        stats: BlindboxStats | null;
    }>({
        broadcaster: null,
        stats: null,
    });

    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(),
        to: new Date()
    });

    const fetchData = async () => {
        try {
            if (!dateRange?.from) return;

            const start = startOfDay(dateRange.from).getTime();
            const end = endOfDay(dateRange.to || dateRange.from).getTime();

            const result = await getBlindboxData(start, end);
            setData(result);
        } catch (error) {
            console.error("Fetch Error:", error);
            if (loading) toast.error("获取数据失败");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange]);

    // 自动轮询
    useEffect(() => {
        const interval = setInterval(() => {
            fetchData();
        }, 5000);
        return () => clearInterval(interval);
    }, [dateRange]);

    if (loading && !data.broadcaster) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
        );
    }

    const stats = data.stats;
    const isProfit = (stats?.netProfit ?? 0) >= 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/40 p-6 rounded-xl border border-zinc-800 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-900/20">
                        <Box className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-100">心动盲盒分析</h2>
                        <p className="text-sm text-zinc-500 mt-1">成本 {BLINDBOX_COST} 电池/盒</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                    <div className="w-px h-8 bg-zinc-800 mx-1" />
                    <Button variant="outline" size="icon" onClick={() => fetchData()} disabled={loading} className="border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800">
                        <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="开盒次数"
                        value={stats.totalBoxes.toLocaleString()}
                        icon={<Box className="h-5 w-5" />}
                        color="amber"
                    />
                    <StatCard
                        title="总投入"
                        value={`${(stats.totalCost / 10).toFixed(1)} ¥`}
                        subtitle={`${stats.totalCost.toLocaleString()} 电池`}
                        icon={<Coins className="h-5 w-5" />}
                        color="blue"
                    />
                    <StatCard
                        title="总产出"
                        value={`${(stats.totalOutput / 10).toFixed(1)} ¥`}
                        subtitle={`${stats.totalOutput.toLocaleString()} 电池`}
                        icon={<Gift className="h-5 w-5" />}
                        color="purple"
                    />
                    <StatCard
                        title="净盈亏"
                        value={`${isProfit ? '+' : ''}${(stats.netProfit / 10).toFixed(1)} ¥`}
                        subtitle={`${stats.profitRate >= 0 ? '+' : ''}${stats.profitRate.toFixed(1)}%`}
                        icon={isProfit ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                        color={isProfit ? "green" : "red"}
                    />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gift Distribution */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
                        <span className="w-1 h-5 bg-amber-500 rounded-full" />
                        礼物分布
                    </h3>
                    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 space-y-3">
                        {stats?.distribution.map((item) => (
                            <GiftDistributionItem key={item.name} item={item} totalBoxes={stats.totalBoxes} />
                        ))}
                        {(!stats || stats.distribution.length === 0) && (
                            <div className="text-center text-zinc-500 py-6">暂无数据</div>
                        )}
                    </div>
                </div>

                {/* Records Table */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
                        <span className="w-1 h-5 bg-orange-500 rounded-full" />
                        开盒记录
                    </h3>
                    <ScrollArea className="h-[500px] rounded-xl border border-zinc-800 bg-zinc-900/50">
                        <div className="p-4 space-y-2">
                            <AnimatePresence initial={false}>
                                {stats?.records.map((record) => (
                                    <RecordItem key={record.id} record={record} />
                                ))}
                            </AnimatePresence>
                            {(!stats || stats.records.length === 0) && (
                                <div className="text-center text-zinc-500 py-10">暂无开盒记录</div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}

// 统计卡片组件
function StatCard({ title, value, subtitle, icon, color }: {
    title: string;
    value: string;
    subtitle?: string;
    icon: React.ReactNode;
    color: 'amber' | 'blue' | 'purple' | 'green' | 'red';
}) {
    const colorClasses = {
        amber: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400',
        blue: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-400',
        purple: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400',
        green: 'from-green-500/20 to-emerald-500/10 border-green-500/30 text-green-400',
        red: 'from-red-500/20 to-rose-500/10 border-red-500/30 text-red-400'
    };

    return (
        <div className={`p-4 rounded-xl border bg-gradient-to-br ${colorClasses[color]} backdrop-blur-sm`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400 text-sm">{title}</span>
                <div className={colorClasses[color].split(' ').pop()}>{icon}</div>
            </div>
            <div className="text-2xl font-bold text-zinc-100">{value}</div>
            {subtitle && <div className="text-xs text-zinc-500 mt-1">{subtitle}</div>}
        </div>
    );
}

// 礼物分布项
function GiftDistributionItem({ item, totalBoxes }: { item: GiftDistribution; totalBoxes: number }) {
    const percentage = totalBoxes > 0 ? (item.count / totalBoxes) * 100 : 0;

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${item.isProfitable ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-zinc-300">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-zinc-500">{item.count} 次</span>
                    <span className={item.isProfitable ? 'text-green-400' : 'text-red-400'}>
                        {item.value} 电池
                    </span>
                </div>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${item.isProfitable ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-rose-400'}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
        </div>
    );
}

// 记录项
function RecordItem({ record }: { record: BlindboxRecord }) {
    const isProfit = record.profit >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/40 border border-zinc-800/60"
        >
            <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-amber-500/30">
                    <AvatarImage src={record.uface ?? undefined} referrerPolicy="no-referrer" />
                    <AvatarFallback>{record.uname?.[0] ?? '?'}</AvatarFallback>
                </Avatar>
                <div>
                    <div className="flex items-baseline gap-2">
                        <span className="font-medium text-amber-400">{record.uname}</span>
                        <span className="text-xs text-zinc-500">开出</span>
                    </div>
                    <div className="font-bold text-zinc-100 flex items-center gap-1">
                        {record.gift_name} {record.gift_num > 1 && <span className="text-amber-500">x{record.gift_num}</span>}
                    </div>
                </div>
            </div>
            <div className="text-right">
                <div className={`text-sm font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                    {isProfit ? '+' : ''}{(record.profit / 10).toFixed(1)} ¥
                </div>
                <div className="text-[10px] text-zinc-600">
                    {record.ts ? new Date(record.ts).toLocaleTimeString() : '-'}
                </div>
            </div>
        </motion.div>
    );
}
