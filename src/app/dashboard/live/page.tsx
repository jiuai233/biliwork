'use client';

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLiveRecordsData } from "./actions";
import { Broadcaster } from "@/lib/types";
import { Radio, Clock, Coins, Gift, Shield, MessageSquare } from "lucide-react";
import { Table } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { startOfDay, endOfDay } from "date-fns";
import { AnalyticsDateRangePicker, type DateRange } from "@/components/dashboard/AnalyticsDateRangePicker";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { PageHeader } from "@/components/shared/PageHeader";
import { RefreshIconButton } from "@/components/shared/RefreshIconButton";
import { StatCard } from "@/components/shared/StatCard";
import { tableChrome } from "@/components/shared/table";
import { formatDateTime, formatDuration } from "@/lib/format";

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
            if (showError) toast.error("获取数据失败");
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        setLoading(true);
        fetchData(true);
    }, [fetchData]);

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
        <div className="min-w-0 space-y-4 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:space-y-0 lg:gap-4 lg:overflow-hidden">
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

            <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-6">
                <StatCard label="开播次数" value={totalSessions} icon={<Radio className="h-4 w-4" />} tone="emerald" className="min-h-0 p-3" />
                <StatCard label="总时长" value={formatDuration(totalDuration, "0m")} icon={<Clock className="h-4 w-4" />} tone="blue" className="min-h-0 p-3" />
                <StatCard label="总收入" value={`${totalIncome.toFixed(1)} ¥`} icon={<Coins className="h-4 w-4" />} tone="amber" className="min-h-0 p-3" />
                <StatCard label="礼物" value={`${totalGift.toFixed(1)} ¥`} icon={<Gift className="h-4 w-4" />} tone="pink" className="min-h-0 p-3" />
                <StatCard label="舰长" value={`${totalGuard.toFixed(1)} ¥`} icon={<Shield className="h-4 w-4" />} tone="blue" className="min-h-0 p-3" />
                <StatCard label="SC" value={`${totalSC.toFixed(1)} ¥`} icon={<MessageSquare className="h-4 w-4" />} tone="yellow" className="min-h-0 p-3" />
            </div>

            <div className="min-h-[420px] w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-card lg:min-h-0 lg:flex-1">
                <div data-testid="live-records-viewport" className="dark-scrollbar h-full w-full max-w-full overflow-auto">
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
                                {data.sessions.map((session) => (
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
                                            {session.title || '-'}
                                        </Table.Cell>
                                        <Table.Cell className="text-muted-foreground">
                                            {session.areaName || '-'}
                                        </Table.Cell>
                                        <Table.Cell className="text-right text-pink-400">
                                            {session.giftIncome.toFixed(1)} ¥
                                        </Table.Cell>
                                        <Table.Cell className="text-right text-blue-400">
                                            {session.guardIncome.toFixed(1)} ¥
                                        </Table.Cell>
                                        <Table.Cell className="text-right text-yellow-400">
                                            {session.scIncome.toFixed(1)} ¥
                                        </Table.Cell>
                                        <Table.Cell className="text-right font-bold text-amber-400">
                                            {session.totalIncome.toFixed(1)} ¥
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
                                                className="h-8 bg-blue-600/80 px-3 text-xs text-white hover:bg-blue-500"
                                            >
                                                详情
                                            </Button>
                                        </Table.Cell>
                                    </Table.Row>
                                ))}
                                {data.sessions.length === 0 && (
                                    <Table.Row id="empty">
                                        <Table.Cell colSpan={10} className="py-10 text-center text-muted-foreground">
                                            暂无开播记录
                                        </Table.Cell>
                                    </Table.Row>
                                )}
                            </Table.Body>
                        </Table.Content>
                    </Table>
                </div>
            </div>
        </div>
    );
}
