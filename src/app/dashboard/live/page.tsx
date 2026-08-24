'use client';

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLiveRecordsData } from "./actions";
import { Broadcaster } from "@/lib/types";
import { Radio, Clock, Coins, Gift, Shield, MessageSquare } from "lucide-react";
import { Table } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { ListPager, useClientPager } from "@/components/shared/ListPager";
import { toast } from "sonner";
import { startOfDay, endOfDay } from "date-fns";
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
    const [data, setData] = useState<{
        broadcaster: Broadcaster | null;
        sessions: LiveSession[];
    }>({
        broadcaster: null,
        sessions: [],
    });

    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        const today = new Date();
        return { from: today, to: today };
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

    const sessionPager = useClientPager(data.sessions, 20);
    const totalSessions = data.sessions.length;
    const totalDuration = data.sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalIncome = data.sessions.reduce((sum, s) => sum + s.totalIncome, 0);
    const totalGift = data.sessions.reduce((sum, s) => sum + s.giftIncome, 0);
    const totalGuard = data.sessions.reduce((sum, s) => sum + s.guardIncome, 0);
    const totalSC = data.sessions.reduce((sum, s) => sum + s.scIncome, 0);

    if (loading && !data.broadcaster) {
        return <LoadingScreen tone="emerald" />;
    }

    return (
        <div className="min-w-0 space-y-6">
            <PageHeader
                icon={<Radio className="h-5 w-5" />}
                iconClass="bg-emerald-500/15 text-emerald-300"
                title="开播记录"
                description="每场直播的收入统计"
                actions={
                    <>
                        <AnalyticsDateRangePicker date={dateRange} setDate={setDateRange} />
                        <RefreshIconButton loading={loading} onClick={() => fetchData()} />
                    </>
                }
            />

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                <StatCard label="开播次数" value={totalSessions} icon={<Radio className="h-4 w-4" />} tone="emerald" />
                <StatCard label="总时长" value={formatDuration(totalDuration, "0m")} icon={<Clock className="h-4 w-4" />} tone="blue" />
                <StatCard label="总收入" value={formatCurrency(totalIncome)} icon={<Coins className="h-4 w-4" />} tone="amber" />
                <StatCard label="礼物" value={formatCurrency(totalGift)} icon={<Gift className="h-4 w-4" />} tone="pink" />
                <StatCard label="舰长" value={formatCurrency(totalGuard)} icon={<Shield className="h-4 w-4" />} tone="blue" />
                <StatCard label="SC" value={formatCurrency(totalSC)} icon={<MessageSquare className="h-4 w-4" />} tone="yellow" />
            </div>

            <div className="w-full min-w-0 overflow-hidden rounded-xl border border-border bg-card">
                <div data-testid="live-records-viewport" className="dark-scrollbar w-full max-w-full overflow-auto">
                    <Table variant="secondary" className="w-full min-w-[1100px]">
                        <Table.Content aria-label="开播记录" className={tableChrome}>
                            <Table.Header>
                                <Table.Column id="start" isRowHeader className="w-[130px]">开播时间</Table.Column>
                                <Table.Column id="end" className="w-[130px]">下播时间</Table.Column>
                                <Table.Column id="duration" className="w-[90px]">时长</Table.Column>
                                <Table.Column id="title" className="w-[220px]">直播标题</Table.Column>
                                <Table.Column id="area" className="w-[120px]">分区</Table.Column>
                                <Table.Column id="gift" className="w-[110px] text-right">礼物</Table.Column>
                                <Table.Column id="guard" className="w-[110px] text-right">舰长</Table.Column>
                                <Table.Column id="sc" className="w-[100px] text-right">SC</Table.Column>
                                <Table.Column id="total" className="w-[120px] text-right">总收入</Table.Column>
                                <Table.Column id="actions" className="w-[80px] text-center">操作</Table.Column>
                            </Table.Header>
                            <Table.Body>
                                {sessionPager.slice.map((session) => (
                                    <Table.Row key={session.id} id={session.id}>
                                        <Table.Cell className="font-medium text-emerald-400">
                                            {formatDateTime(session.startTs)}
                                        </Table.Cell>
                                        <Table.Cell className="text-muted-foreground">
                                            {session.endTs ? formatDateTime(session.endTs) : <span className="text-emerald-400">直播中</span>}
                                        </Table.Cell>
                                        <Table.Cell className="text-secondary-foreground">
                                            {formatDuration(session.duration)}
                                        </Table.Cell>
                                        <Table.Cell className="max-w-[200px] truncate text-foreground">
                                            <span title={session.title || undefined}>{session.title || '-'}</span>
                                        </Table.Cell>
                                        <Table.Cell className="text-muted-foreground">
                                            {session.areaName || '-'}
                                        </Table.Cell>
                                        <Table.Cell className="text-right tabular-nums text-secondary-foreground">
                                            {formatCurrency(session.giftIncome)}
                                        </Table.Cell>
                                        <Table.Cell className="text-right tabular-nums text-secondary-foreground">
                                            {formatCurrency(session.guardIncome)}
                                        </Table.Cell>
                                        <Table.Cell className="text-right tabular-nums text-secondary-foreground">
                                            {formatCurrency(session.scIncome)}
                                        </Table.Cell>
                                        <Table.Cell className="text-right font-bold tabular-nums text-money">
                                            {formatCurrency(session.totalIncome)}
                                        </Table.Cell>
                                        <Table.Cell className="text-center">
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    const params = new URLSearchParams({
                                                        start: session.startTs.toString(),
                                                        end: (session.endTs || Date.now()).toString(),
                                                        title: session.title || `${formatDateTime(session.startTs)} 直播`,
                                                    });
                                                    router.push(`/dashboard/live/detail?${params}`);
                                                }}
                                                className="h-8 bg-primary px-3 text-xs text-white hover:bg-primary/90"
                                            >
                                                详情
                                            </Button>
                                        </Table.Cell>
                                    </Table.Row>
                                ))}
                                {data.sessions.length === 0 && (
                                    <Table.Row id="empty">
                                        <Table.Cell colSpan={10} className="py-10 text-center text-muted-foreground">
                                            这段日期没有开播记录，换个日期再看。
                                        </Table.Cell>
                                    </Table.Row>
                                )}
                            </Table.Body>
                        </Table.Content>
                    </Table>
                </div>
                {data.sessions.length > 0 && (
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
