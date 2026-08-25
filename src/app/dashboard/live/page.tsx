'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getLiveRecordsData } from "./actions";
import { Broadcaster } from "@/lib/types";
import {
    Radio,
    Clock,
    Coins,
    Gift,
    Shield,
    MessageSquare,
    Search,
    Download,
    ArrowRight,
} from "lucide-react";
import { Table } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListPager, useClientPager } from "@/components/shared/ListPager";
import { toast } from "sonner";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { AnalyticsDateRangePicker, type DateRange } from "@/components/dashboard/AnalyticsDateRangePicker";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { PageHeader } from "@/components/shared/PageHeader";
import { RefreshIconButton } from "@/components/shared/RefreshIconButton";
import { StatCard } from "@/components/shared/StatCard";
import { tableChrome } from "@/components/shared/table";
import { formatCurrency, formatDateTime, formatDuration } from "@/lib/format";

interface LiveSession {
    id: number;
    startTs: number;
    endTs: number | null;
    duration: number;
    title: string | null;
    areaName: string | null;
    giftIncome: number;
    guardIncome: number;
    scIncome: number;
    totalIncome: number;
}

export default function LiveRecordsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [data, setData] = useState<{
        broadcaster: Broadcaster | null;
        sessions: LiveSession[];
    }>({
        broadcaster: null,
        sessions: [],
    });

    // Default to last 30 days so user immediately sees historical sessions
    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        const today = new Date();
        return { from: subDays(today, 30), to: today };
    });

    const fetchData = useCallback(async (showError = false) => {
        try {
            if (!dateRange?.from) return;

            const start = startOfDay(dateRange.from).getTime();
            const end = endOfDay(dateRange.to || dateRange.from).getTime();

            const result = await getLiveRecordsData(start, end);
            setData(result);
        } catch (error) {
            console.error("Fetch Error:", error);
            if (showError) toast.error("无法加载开播记录，请刷新后重试");
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        setLoading(true);
        fetchData(true);
    }, [fetchData]);

    // Local search filtering by title or area
    const filteredSessions = useMemo(() => {
        if (!searchQuery.trim()) return data.sessions;
        const q = searchQuery.trim().toLowerCase();
        return data.sessions.filter((s) => {
            const title = (s.title ?? '').toLowerCase();
            const area = (s.areaName ?? '').toLowerCase();
            return title.includes(q) || area.includes(q);
        });
    }, [data.sessions, searchQuery]);

    const sessionPager = useClientPager(filteredSessions, 20);
    const totalSessions = data.sessions.length;
    const totalDuration = data.sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalIncome = data.sessions.reduce((sum, s) => sum + s.totalIncome, 0);
    const totalGift = data.sessions.reduce((sum, s) => sum + s.giftIncome, 0);
    const totalGuard = data.sessions.reduce((sum, s) => sum + s.guardIncome, 0);
    const totalSC = data.sessions.reduce((sum, s) => sum + s.scIncome, 0);

    // Export CSV of sessions
    const exportCsv = useCallback(() => {
        if (data.sessions.length === 0) {
            toast.error('当前列表没有开播记录可导出');
            return;
        }
        const headers = ['开播时间', '下播时间', '时长(分钟)', '直播标题', '分区', '礼物收入', '舰长收入', 'SC收入', '总收入'];
        const rows = data.sessions.map((s) => [
            formatDateTime(s.startTs),
            s.endTs ? formatDateTime(s.endTs) : '直播中',
            s.duration,
            `"${(s.title ?? '').replace(/"/g, '""')}"`,
            `"${(s.areaName ?? '').replace(/"/g, '""')}"`,
            s.giftIncome.toFixed(2),
            s.guardIncome.toFixed(2),
            s.scIncome.toFixed(2),
            s.totalIncome.toFixed(2),
        ]);
        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `live-records-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('已导出开播记录报表 CSV');
    }, [data.sessions]);

    if (loading && !data.broadcaster) {
        return <LoadingScreen tone="emerald" />;
    }

    return (
        <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col space-y-4 lg:space-y-0 lg:gap-4 overflow-y-auto lg:overflow-hidden">
            {/* Header */}
            <PageHeader
                icon={<Radio className="h-5 w-5" />}
                iconClass="bg-emerald-500/15 text-emerald-400"
                title="开播记录"
                description={
                    <span className="flex flex-wrap items-center gap-2 text-xs">
                        <span>历史每场直播营收与时长复盘</span>
                        {data.broadcaster?.uname && (
                            <>
                                <span className="text-border">•</span>
                                <span className="text-muted-foreground font-mono">
                                    主播: {data.broadcaster.uname} (房号: {data.broadcaster.room_id})
                                </span>
                            </>
                        )}
                    </span>
                }
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <AnalyticsDateRangePicker date={dateRange} setDate={setDateRange} />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1 rounded-lg text-xs"
                            onClick={exportCsv}
                        >
                            <Download className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="hidden sm:inline">导出报表</span>
                        </Button>
                        <RefreshIconButton loading={loading} onClick={() => fetchData()} />
                    </div>
                }
            />

            {/* 6 Metric KPI Cards */}
            <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard
                    label="开播场次"
                    value={`${totalSessions} 场`}
                    icon={<Radio className="h-4 w-4 text-emerald-500" />}
                    tone="emerald"
                    sub="所选区间统计"
                />
                <StatCard
                    label="累计开播时长"
                    value={formatDuration(totalDuration, "0m")}
                    icon={<Clock className="h-4 w-4 text-sky-500" />}
                    tone="sky"
                    sub={totalSessions > 0 ? `场均 ${formatDuration(Math.round(totalDuration / totalSessions))}` : undefined}
                />
                <StatCard
                    label="总累计收入"
                    value={formatCurrency(totalIncome)}
                    icon={<Coins className="h-4 w-4 text-amber-500" />}
                    tone="amber"
                    sub={totalSessions > 0 ? `场均 ${formatCurrency(totalIncome / totalSessions)}` : undefined}
                />
                <StatCard
                    label="礼物收益"
                    value={formatCurrency(totalGift)}
                    icon={<Gift className="h-4 w-4 text-pink-500" />}
                    tone="pink"
                    sub={totalIncome > 0 ? `占比 ${((totalGift / totalIncome) * 100).toFixed(1)}%` : undefined}
                />
                <StatCard
                    label="大航海舰长"
                    value={formatCurrency(totalGuard)}
                    icon={<Shield className="h-4 w-4 text-indigo-500" />}
                    tone="indigo"
                    sub={totalIncome > 0 ? `占比 ${((totalGuard / totalIncome) * 100).toFixed(1)}%` : undefined}
                />
                <StatCard
                    label="SC 醒目留言"
                    value={formatCurrency(totalSC)}
                    icon={<MessageSquare className="h-4 w-4 text-yellow-500" />}
                    tone="yellow"
                    sub={totalIncome > 0 ? `占比 ${((totalSC / totalIncome) * 100).toFixed(1)}%` : undefined}
                />
            </div>

            {/* Main Table Container */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
                {/* Table Header Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/60 p-3 px-4 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">场次明细列表</span>
                        <span className="font-mono text-xs text-muted-foreground">
                            (共 {filteredSessions.length} 场)
                        </span>
                    </div>

                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            aria-label="搜索直播标题或分区"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索直播标题或分区..."
                            className="h-8 w-44 sm:w-56 pl-8 text-base sm:text-sm"
                        />
                    </div>
                </div>

                {/* Table Viewport */}
                <div data-testid="live-records-viewport" className="dark-scrollbar min-h-0 flex-1 overflow-auto">
                    <Table variant="secondary" className="w-full">
                        <Table.ScrollContainer className="w-full">
                            <Table.Content aria-label="开播记录" className={`${tableChrome} min-w-[960px]`}>
                                <Table.Header>
                                    <Table.Column id="start" isRowHeader className="w-[160px] pl-5">开播时间</Table.Column>
                                    <Table.Column id="end" className="w-[150px]">下播时间</Table.Column>
                                    <Table.Column id="duration" className="w-[90px]">时长</Table.Column>
                                    <Table.Column id="title" className="min-w-[200px]">直播标题与分区</Table.Column>
                                    <Table.Column id="gift" className="w-[110px] text-right">礼物收益</Table.Column>
                                    <Table.Column id="guard" className="w-[110px] text-right">舰长</Table.Column>
                                    <Table.Column id="sc" className="w-[100px] text-right">SC</Table.Column>
                                    <Table.Column id="total" className="w-[130px] text-right">单场总收入</Table.Column>
                                    <Table.Column id="actions" className="w-[90px] pr-5 text-center">操作</Table.Column>
                                </Table.Header>
                                <Table.Body>
                                    {sessionPager.slice.map((session) => {
                                        const isLive = !session.endTs;
                                        return (
                                            <Table.Row
                                                key={session.id}
                                                id={session.id}
                                                className={`transition-colors ${isLive ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-accent/40'}`}
                                            >
                                                <Table.Cell className="pl-5 font-mono text-xs text-foreground font-medium">
                                                    {formatDateTime(session.startTs)}
                                                </Table.Cell>
                                                <Table.Cell className="text-xs">
                                                    {isLive ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
                                                            直播进行中
                                                        </span>
                                                    ) : (
                                                        <span className="font-mono text-muted-foreground">{formatDateTime(session.endTs!)}</span>
                                                    )}
                                                </Table.Cell>
                                                <Table.Cell className="font-mono text-xs text-secondary-foreground">
                                                    {formatDuration(session.duration)}
                                                </Table.Cell>
                                                <Table.Cell className="text-xs">
                                                    <div className="max-w-[320px] truncate">
                                                        <div className="font-semibold text-foreground truncate" title={session.title || undefined}>
                                                            {session.title || '无标题直播'}
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                                            {session.areaName ? `分区: ${session.areaName}` : '未分类'}
                                                        </div>
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell className="text-right font-mono text-xs text-secondary-foreground">
                                                    {formatCurrency(session.giftIncome)}
                                                </Table.Cell>
                                                <Table.Cell className="text-right font-mono text-xs text-secondary-foreground">
                                                    {formatCurrency(session.guardIncome)}
                                                </Table.Cell>
                                                <Table.Cell className="text-right font-mono text-xs text-secondary-foreground">
                                                    {formatCurrency(session.scIncome)}
                                                </Table.Cell>
                                                <Table.Cell className="text-right font-mono font-bold text-xs text-money">
                                                    {formatCurrency(session.totalIncome)}
                                                </Table.Cell>
                                                <Table.Cell className="pr-5 text-center">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            const params = new URLSearchParams({
                                                                start: session.startTs.toString(),
                                                                end: (session.endTs || Date.now()).toString(),
                                                                title: session.title || `${formatDateTime(session.startTs)} 直播`,
                                                            });
                                                            router.push(`/dashboard/live/detail?${params}`);
                                                        }}
                                                        className="h-7 gap-1 px-2.5 text-xs text-primary hover:bg-primary/10"
                                                    >
                                                        <span>详情</span>
                                                        <ArrowRight className="h-3 w-3" />
                                                    </Button>
                                                </Table.Cell>
                                            </Table.Row>
                                        );
                                    })}
                                    {filteredSessions.length === 0 && (
                                        <Table.Row id="empty">
                                            <Table.Cell colSpan={9} className="py-16 text-center text-muted-foreground">
                                                {searchQuery ? '没有找到符合关键字的开播场次。' : '所选日期区间暂无开播记录，请更换时间范围。'}
                                            </Table.Cell>
                                        </Table.Row>
                                    )}
                                </Table.Body>
                            </Table.Content>
                        </Table.ScrollContainer>
                    </Table>
                </div>

                {/* Pagination */}
                {filteredSessions.length > 0 && (
                    <ListPager
                        total={sessionPager.total}
                        page={sessionPager.page}
                        pageCount={sessionPager.pageCount}
                        pageSize={sessionPager.pageSize}
                        onPageChange={sessionPager.setPage}
                        onPageSizeChange={sessionPager.setPageSize}
                    />
                )}
            </div>
        </div>
    );
}

