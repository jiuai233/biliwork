'use client';

import { useEffect, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { endOfDay, format, startOfDay } from "date-fns";
import { toast } from "sonner";
import { Avatar, Table } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Box,
    ClipboardList,
    Coins,
    Filter,
    Gift,
    Loader2,
    RefreshCcw,
    Search,
    TrendingDown,
    TrendingUp,
} from "lucide-react";
import { getBlindboxData } from "./actions";
import { AnalyticsDateRangePicker } from "@/components/dashboard/AnalyticsDateRangePicker";
import { BLINDBOX_COST, BlindboxStats, Broadcaster, GiftDistribution } from "@/lib/types";
import { cn } from "@/lib/utils";

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
        to: new Date(),
    });

    const [searchUsername, setSearchUsername] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [giftFilter, setGiftFilter] = useState("all");

    const fetchData = async () => {
        try {
            if (!dateRange?.from) return;

            const start = startOfDay(dateRange.from).getTime();
            const end = endOfDay(dateRange.to || dateRange.from).getTime();
            const result = await getBlindboxData(start, end, searchUsername || undefined);
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
    }, [dateRange, searchUsername]);

    useEffect(() => {
        const interval = setInterval(() => {
            fetchData();
        }, 5000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange, searchUsername]);

    const handleSearch = () => {
        setSearchUsername(searchInput.trim());
    };

    const stats = data.stats;
    const isProfit = (stats?.netProfit ?? 0) >= 0;
    const records = useMemo(() => stats?.records ?? [], [stats]);
    const giftOptions = useMemo(() => {
        return stats?.distribution
            .filter((item) => item.count > 0)
            .map((item) => item.name) ?? [];
    }, [stats]);
    const filteredRecords = useMemo(() => {
        if (giftFilter === "all") return records;
        return records.filter((record) => record.gift_name === giftFilter);
    }, [giftFilter, records]);
    const hasRecords = filteredRecords.length > 0;

    if (loading && !data.broadcaster) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
            </div>
        );
    }

    const formatDateTime = (ts: number | null) => {
        if (!ts) return "-";
        return format(new Date(ts), "MM-dd HH:mm");
    };

    return (
        <div className="space-y-4 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:space-y-0 lg:gap-4 lg:overflow-hidden">
            <section className="shrink-0 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-400/25 bg-orange-500/15 text-orange-200">
                            <Box className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-2xl font-black tracking-normal text-white md:text-3xl">心动盲盒分析</h1>
                            <p className="mt-1 text-sm font-medium text-slate-400">成本 {BLINDBOX_COST} 电池/盒，按所选日期统计开盒盈亏。</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <AnalyticsDateRangePicker date={dateRange} setDate={setDateRange} />
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => fetchData()}
                            disabled={loading}
                            aria-label="刷新"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] p-0 text-slate-200 hover:bg-white/[0.09]"
                        >
                            <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                        </Button>
                    </div>
                </div>
            </section>

            {stats && (
                <div className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4">
                    <BlindboxStatCard
                        title="开盒次数"
                        value={stats.totalBoxes.toLocaleString()}
                        subTop="较昨日 --"
                        subBottom="较昨日 --"
                        icon={<Box className="h-5 w-5" />}
                        tone="orange"
                    />
                    <BlindboxStatCard
                        title="总投入"
                        value={`${(stats.totalCost / 10).toFixed(1)} ¥`}
                        subTop={`${stats.totalCost.toLocaleString()} 电池`}
                        subBottom="较昨日 --"
                        icon={<Coins className="h-5 w-5" />}
                        tone="blue"
                    />
                    <BlindboxStatCard
                        title="总产出"
                        value={`${(stats.totalOutput / 10).toFixed(1)} ¥`}
                        subTop={`${stats.totalOutput.toLocaleString()} 电池`}
                        subBottom="较昨日 --"
                        icon={<Gift className="h-5 w-5" />}
                        tone="purple"
                    />
                    <BlindboxStatCard
                        title="净盈亏"
                        value={`${isProfit ? "+" : ""}${(stats.netProfit / 10).toFixed(1)} ¥`}
                        subTop={`${isProfit ? "+" : ""}${stats.profitRate.toFixed(2)}%`}
                        subBottom="较昨日 --"
                        icon={isProfit ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                        tone="green"
                    />
                </div>
            )}

            <div className="space-y-4 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:space-y-0 lg:gap-4">
                <section className="shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-950/55 shadow-[0_14px_45px_rgba(0,0,0,0.20)]">
                    <div className="flex flex-col gap-2 border-b border-white/10 px-4 py-3 md:flex-row md:items-center md:justify-between">
                        <h2 className="flex items-center gap-2 text-base font-extrabold text-white">
                            <Gift className="h-5 w-5 text-orange-300" />
                            礼物分布
                        </h2>
                        <div className="text-xs font-medium text-slate-500">
                            按价值排序，展示开盒产出结构
                        </div>
                    </div>
                    <div
                        data-testid="blindbox-distribution-grid"
                        className="grid grid-cols-2 gap-2 p-3 md:grid-cols-4 xl:grid-cols-7"
                    >
                        {stats?.distribution.map((item) => (
                            <GiftDistributionCard key={item.name} item={item} totalBoxes={stats.totalBoxes} />
                        ))}
                        {(!stats || stats.distribution.length === 0) && (
                            <div className="col-span-full py-6 text-center text-sm text-slate-500">暂无数据</div>
                        )}
                    </div>
                </section>

                <section className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/55 shadow-[0_14px_45px_rgba(0,0,0,0.20)] lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
                    <div className="flex shrink-0 flex-col gap-3 border-b border-white/10 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                        <h2 className="flex items-center gap-3 text-lg font-extrabold text-white">
                            <span className="h-6 w-1 rounded-full bg-orange-500" />
                            开盒记录
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs font-semibold text-slate-400">
                                {filteredRecords.length}/{records.length}
                            </span>
                        </h2>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative w-full sm:w-[210px]">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <Input
                                    placeholder="搜索用户名..."
                                    value={searchInput}
                                    onChange={(event) => setSearchInput(event.target.value)}
                                    onKeyDown={(event) => event.key === "Enter" && handleSearch()}
                                    className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.04] pl-9 text-sm text-white"
                                />
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleSearch}
                                className="inline-flex h-9 items-center justify-center rounded-lg bg-orange-600 px-4 text-sm font-bold text-white hover:bg-orange-500"
                            >
                                搜索
                            </Button>
                            <label className="relative inline-flex h-9 min-w-[150px] items-center">
                                <Filter className="pointer-events-none absolute left-3 h-4 w-4 text-slate-500" />
                                <select
                                    aria-label="筛选礼物"
                                    value={giftFilter}
                                    onChange={(event) => setGiftFilter(event.target.value)}
                                    className="h-9 w-full appearance-none rounded-lg border border-white/10 bg-slate-950/90 pl-9 pr-8 text-sm font-medium text-slate-300 outline-none hover:bg-white/[0.06] focus:border-orange-400/60"
                                >
                                    <option value="all">全部礼物</option>
                                    {giftOptions.map((giftName) => (
                                        <option key={giftName} value={giftName}>{giftName}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </div>

                    <div
                        data-testid="blindbox-records-viewport"
                        className={cn(
                            "dark-scrollbar relative min-h-[520px] overflow-x-auto lg:min-h-0 lg:flex-1",
                            hasRecords ? "overflow-y-auto" : "overflow-y-hidden"
                        )}
                    >
                        <Table variant="secondary" className="min-w-[760px]">
                            <Table.Content
                                aria-label="开盒记录"
                                className="w-full table-fixed border-collapse [&_tbody_tr]:border-b [&_tbody_tr]:border-white/10 [&_tbody_tr:hover]:bg-white/[0.035] [&_td]:px-4 [&_td]:py-3 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-slate-950 [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-sm [&_th]:text-slate-300"
                            >
                                <Table.Header>
                                    <Table.Column id="time" isRowHeader>时间</Table.Column>
                                    <Table.Column id="user">用户</Table.Column>
                                    <Table.Column id="gift">礼物</Table.Column>
                                    <Table.Column id="count" className="text-center">数量</Table.Column>
                                    <Table.Column id="value" className="text-right">总价值</Table.Column>
                                    <Table.Column id="profit" className="text-right">盈亏</Table.Column>
                                    <Table.Column id="note" className="text-right">状态</Table.Column>
                                </Table.Header>
                                <Table.Body>
                                    {filteredRecords.map((record) => {
                                        const isRecordProfit = record.profit >= 0;
                                        const statusText = record.profit > 0 ? "盈利" : record.profit < 0 ? "亏损" : "持平";
                                        return (
                                            <Table.Row key={record.row_key} id={record.row_key}>
                                                <Table.Cell className="text-sm text-slate-400">{formatDateTime(record.ts)}</Table.Cell>
                                                <Table.Cell>
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-8 w-8 border border-orange-400/30">
                                                            <Avatar.Image src={record.uface ?? undefined} referrerPolicy="no-referrer" />
                                                            <Avatar.Fallback className="text-xs">{record.uname?.[0] ?? "?"}</Avatar.Fallback>
                                                        </Avatar>
                                                        <span className="font-semibold text-orange-200">{record.uname}</span>
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell className="font-medium text-slate-100">{record.gift_name}</Table.Cell>
                                                <Table.Cell className="text-center font-bold text-orange-300">x{record.gift_num}</Table.Cell>
                                                <Table.Cell className="text-right text-slate-300">{record.gift_value} 电池</Table.Cell>
                                                <Table.Cell className={cn("text-right font-bold", isRecordProfit ? "text-emerald-300" : "text-red-300")}>
                                                    {isRecordProfit ? "+" : ""}{record.profit} 电池
                                                </Table.Cell>
                                                <Table.Cell className={cn("text-right text-sm font-semibold", isRecordProfit ? "text-emerald-300" : "text-red-300")}>
                                                    {statusText}
                                                </Table.Cell>
                                            </Table.Row>
                                        );
                                    })}
                                </Table.Body>
                            </Table.Content>
                        </Table>

                        {!hasRecords && (
                            <div className="absolute inset-x-0 bottom-0 top-[45px] flex flex-col items-center justify-center border-t border-white/10 text-center text-slate-400">
                                <div className="mb-5 rounded-3xl bg-white/[0.06] p-6 text-slate-500 shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
                                    <ClipboardList className="h-16 w-16" />
                                </div>
                                <div className="text-xl font-extrabold text-white">暂无开盒记录</div>
                                <p className="mt-3 text-sm text-slate-400">调整日期、用户名或礼物筛选后再查看</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

function BlindboxStatCard({
    title,
    value,
    subTop,
    subBottom,
    icon,
    tone,
}: {
    title: string;
    value: string;
    subTop: string;
    subBottom: string;
    icon: React.ReactNode;
    tone: "orange" | "blue" | "purple" | "green";
}) {
    const toneMap = {
        orange: {
            card: "border-orange-400/35 from-orange-500/20 via-slate-950/80 to-slate-950",
            icon: "text-orange-200",
            glow: "bg-orange-400/25",
        },
        blue: {
            card: "border-sky-400/35 from-sky-500/20 via-slate-950/80 to-slate-950",
            icon: "text-sky-300",
            glow: "bg-sky-400/25",
        },
        purple: {
            card: "border-purple-400/35 from-purple-500/20 via-slate-950/80 to-slate-950",
            icon: "text-purple-200",
            glow: "bg-purple-400/25",
        },
        green: {
            card: "border-emerald-400/35 from-emerald-500/20 via-slate-950/80 to-slate-950",
            icon: "text-emerald-300",
            glow: "bg-emerald-400/25",
        },
    };

    const styles = toneMap[tone];

    return (
        <section className={cn("relative min-h-[108px] overflow-hidden rounded-xl border bg-gradient-to-br p-4 shadow-[0_14px_40px_rgba(0,0,0,0.20)]", styles.card)}>
            <div className={cn("absolute bottom-5 right-6 h-12 w-12 rounded-full blur-2xl", styles.glow)} />
            <div className="relative flex items-start justify-between">
                <span className="text-sm font-semibold text-slate-300">{title}</span>
                <div className={styles.icon}>{icon}</div>
            </div>
            <div className="relative mt-3 text-2xl font-black tracking-normal text-white md:text-3xl">{value}</div>
            <div className="relative mt-1 text-xs font-medium text-slate-300">{subTop}</div>
            <div className="relative mt-2 text-xs text-slate-500">{subBottom}</div>
        </section>
    );
}

function GiftDistributionCard({ item, totalBoxes }: { item: GiftDistribution; totalBoxes: number }) {
    const percentage = totalBoxes > 0 ? (item.count / totalBoxes) * 100 : 0;
    const valuable = item.value >= BLINDBOX_COST;

    return (
        <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", valuable ? "bg-emerald-400" : "bg-red-400")} />
                        <span className="truncate text-sm font-bold text-slate-100">{item.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{item.count} 次</div>
                </div>
                <div className={cn("shrink-0 text-right text-sm font-black", valuable ? "text-emerald-300" : "text-red-300")}>
                    {item.value}
                    <div className="text-[10px] font-semibold text-slate-500">电池</div>
                </div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                    className={cn("h-full rounded-full", valuable ? "bg-gradient-to-r from-emerald-400 to-cyan-300" : "bg-gradient-to-r from-red-400 to-orange-300")}
                    style={{ width: `${Math.max(8, Math.min(percentage, 100))}%` }}
                />
            </div>
        </div>
    );
}
