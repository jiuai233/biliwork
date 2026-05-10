'use client';

import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { endOfDay, format, startOfDay } from "date-fns";
import { toast } from "sonner";
import { Avatar, Button, Input, Table } from "@heroui/react";
import {
    Box,
    ChevronRight,
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

    if (loading && !data.broadcaster) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
            </div>
        );
    }

    const stats = data.stats;
    const isProfit = (stats?.netProfit ?? 0) >= 0;
    const records = stats?.records ?? [];

    const formatDateTime = (ts: number | null) => {
        if (!ts) return "-";
        return format(new Date(ts), "MM-dd HH:mm");
    };

    return (
        <div className="space-y-6">
            <section className="relative rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.14),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.82))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.30)]">
                <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-700 shadow-[0_18px_45px_rgba(249,115,22,0.28)]">
                            <Box className="h-9 w-9 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-normal text-white">心动盲盒分析</h1>
                            <p className="mt-2 text-sm font-medium text-slate-400">成本 {BLINDBOX_COST} 电池/盒</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <AnalyticsDateRangePicker date={dateRange} setDate={setDateRange} />
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => fetchData()}
                            isDisabled={loading}
                            aria-label="刷新"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] p-0 text-slate-200 hover:bg-white/[0.09]"
                        >
                            <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                        </Button>
                    </div>
                </div>
            </section>

            {stats && (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
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

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
                <aside className="space-y-5">
                    <section className="min-h-[690px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55 shadow-[0_20px_65px_rgba(0,0,0,0.24)]">
                        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                            <h2 className="flex items-center gap-2 text-lg font-extrabold text-white">
                                <Gift className="h-5 w-5 text-orange-300" />
                                礼物分布
                            </h2>
                        </div>
                        <div className="space-y-4 p-5">
                            {stats?.distribution.slice(0, 7).map((item) => (
                                <GiftDistributionItem key={item.name} item={item} totalBoxes={stats.totalBoxes} />
                            ))}
                            {(!stats || stats.distribution.length === 0) && (
                                <div className="py-8 text-center text-sm text-slate-500">暂无数据</div>
                            )}
                        </div>
                    </section>

                </aside>

                <section className="min-h-[690px] overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.10),transparent_38%),rgba(2,6,23,0.62)] shadow-[0_20px_65px_rgba(0,0,0,0.24)]">
                    <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                        <h2 className="flex items-center gap-3 text-xl font-extrabold text-white">
                            <span className="h-6 w-1 rounded-full bg-orange-500" />
                            开盒记录
                        </h2>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <Input
                                    placeholder="搜索用户名..."
                                    value={searchInput}
                                    onChange={(event) => setSearchInput(event.target.value)}
                                    onKeyDown={(event) => event.key === "Enter" && handleSearch()}
                                    variant="secondary"
                                    className="h-10 w-[210px] rounded-xl border border-white/10 bg-white/[0.04] pl-9 text-sm text-white"
                                />
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="primary"
                                onClick={handleSearch}
                                className="inline-flex h-10 items-center justify-center rounded-xl px-5 text-sm font-bold"
                            >
                                搜索
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-medium text-slate-300"
                            >
                                <Filter className="h-4 w-4" />
                                全部礼物
                            </Button>
                        </div>
                    </div>

                    <div className="dark-scrollbar overflow-auto">
                        <Table variant="secondary" className="min-w-[880px]">
                            <Table.Content
                                aria-label="开盒记录"
                                className="w-full table-fixed border-collapse [&_tbody_tr]:border-b [&_tbody_tr]:border-white/10 [&_tbody_tr:hover]:bg-white/[0.035] [&_td]:px-5 [&_td]:py-4 [&_th]:bg-white/[0.045] [&_th]:px-5 [&_th]:py-4 [&_th]:text-left [&_th]:text-slate-300"
                            >
                                <Table.Header>
                                    <Table.Column id="time" isRowHeader>时间</Table.Column>
                                    <Table.Column id="user">用户</Table.Column>
                                    <Table.Column id="gift">礼物</Table.Column>
                                    <Table.Column id="count" className="text-center">数量</Table.Column>
                                    <Table.Column id="value" className="text-right">总价值</Table.Column>
                                    <Table.Column id="profit" className="text-right">盈亏</Table.Column>
                                    <Table.Column id="note" className="text-right">备注</Table.Column>
                                </Table.Header>
                                <Table.Body>
                                    {records.map((record) => {
                                        const isRecordProfit = record.profit >= 0;
                                        return (
                                            <Table.Row key={record.id} id={record.id}>
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
                                                <Table.Cell className="text-right text-slate-500">
                                                    <ChevronRight className="ml-auto h-4 w-4" />
                                                </Table.Cell>
                                            </Table.Row>
                                        );
                                    })}

                                    {records.length === 0 && (
                                        <Table.Row id="empty">
                                            <Table.Cell colSpan={7} className="h-[500px] text-center">
                                                <div className="flex flex-col items-center justify-center text-slate-400">
                                                    <div className="mb-5 rounded-3xl bg-white/[0.06] p-6 text-slate-500 shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
                                                        <ClipboardList className="h-16 w-16" />
                                                    </div>
                                                    <div className="text-xl font-extrabold text-white">暂无开盒记录</div>
                                                    <p className="mt-3 text-sm text-slate-400">开盒记录将在这里显示</p>
                                                </div>
                                            </Table.Cell>
                                        </Table.Row>
                                    )}
                                </Table.Body>
                            </Table.Content>
                        </Table>
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
        <section className={cn("relative min-h-[190px] overflow-hidden rounded-2xl border bg-gradient-to-br p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)]", styles.card)}>
            <div className={cn("absolute bottom-7 right-8 h-16 w-16 rounded-full blur-2xl", styles.glow)} />
            <div className="relative flex items-start justify-between">
                <span className="text-base font-semibold text-slate-200">{title}</span>
                <div className={styles.icon}>{icon}</div>
            </div>
            <div className="relative mt-7 text-4xl font-black tracking-normal text-white">{value}</div>
            <div className="relative mt-3 text-sm font-medium text-slate-300">{subTop}</div>
            <div className="relative mt-6 text-sm text-slate-500">{subBottom}</div>
        </section>
    );
}

function GiftDistributionItem({ item, totalBoxes }: { item: GiftDistribution; totalBoxes: number }) {
    const percentage = totalBoxes > 0 ? (item.count / totalBoxes) * 100 : 0;
    const valuable = item.value >= BLINDBOX_COST;

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
                <span className={cn("h-2.5 w-2.5 rounded-full", valuable ? "bg-emerald-400" : "bg-red-400")} />
                <span className="min-w-0 flex-1 truncate font-semibold text-slate-200">{item.name}</span>
                <span className="text-slate-500">{item.count} 次</span>
                <span className={cn("w-[86px] text-right font-bold", valuable ? "text-emerald-300" : "text-red-300")}>
                    {item.value} 电池
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                    className={cn("h-full rounded-full", valuable ? "bg-gradient-to-r from-emerald-400 to-cyan-300" : "bg-gradient-to-r from-red-400 to-orange-300")}
                    style={{ width: `${Math.max(8, Math.min(percentage, 100))}%` }}
                />
            </div>
        </div>
    );
}
