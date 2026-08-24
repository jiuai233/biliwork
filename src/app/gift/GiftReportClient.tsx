'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { endOfDay, startOfDay } from 'date-fns';
import { Download, Gift, Loader2, LogOut, TrendingDown, TrendingUp } from 'lucide-react';
import { logout } from '@/lib/auth';
import { toast } from 'sonner';
import { BiliQrPanel } from '@/components/bilibili/BiliQrPanel';
import { AnalyticsDateRangePicker, type DateRange } from '@/components/dashboard/AnalyticsDateRangePicker';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { SectionCard } from '@/components/shared/SectionCard';
import { StatCard } from '@/components/shared/StatCard';
import { tableChrome } from '@/components/shared/table';
import { formatCurrency } from '@/lib/format';
import { BLINDBOX_COST } from '@/lib/types';
import {
    exportGiftReportCsvAction,
    generateGiftQrAction,
    getGiftReportAction,
    pollGiftQrAction,
} from './actions';

type Report = Extract<Awaited<ReturnType<typeof getGiftReportAction>>, { ok: true }>;

type Phase = 'boot' | 'qr' | 'waiting' | 'report';

function formatYmd(value: string | null): string {
    if (!value || value.length !== 8) return '-';
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function syncState(status: string | undefined): { label: string; className: string } {
    if (status === 'queued') {
        return { label: '排队', className: 'border-primary/20 bg-primary/10 text-primary' };
    }
    if (status === 'running') {
        return { label: '正在执行', className: 'border-primary/20 bg-primary/10 text-primary' };
    }
    if (status === 'error') {
        return { label: '失败', className: 'border-loss/20 bg-loss/10 text-loss' };
    }
    if (status === 'done') {
        return { label: '结束', className: 'border-profit/20 bg-profit/10 text-profit' };
    }
    return { label: '排队', className: 'border-primary/20 bg-primary/10 text-primary' };
}

function downloadCsv(filename: string, csv: string) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function defaultDateRange(): DateRange {
    const now = new Date();
    return { from: new Date(now.getFullYear(), 0, 1), to: now };
}

export function GiftReportClient() {
    const [phase, setPhase] = useState<Phase>('boot');
    const [report, setReport] = useState<Report | null>(null);
    const [exporting, setExporting] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);

    const rangeTimes = useMemo(() => {
        const from = dateRange.from ?? new Date(new Date().getFullYear(), 0, 1);
        const to = dateRange.to ?? from;
        return { startTime: startOfDay(from).getTime(), endTime: endOfDay(to).getTime() };
    }, [dateRange]);

    const generateQr = useCallback(() => generateGiftQrAction(), []);
    const pollQr = useCallback((qrcodeKey: string) => pollGiftQrAction(qrcodeKey), []);

    const loadReport = useCallback(async () => {
        const result = await getGiftReportAction(rangeTimes.startTime, rangeTimes.endTime);
        if (!result.ok) return null;
        setReport(result);
        return result;
    }, [rangeTimes.startTime, rangeTimes.endTime]);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const result = await loadReport();
            if (cancelled) return;
            if (result) setPhase('report');
            else setPhase((current) => (current === 'report' || current === 'waiting' ? current : 'qr'));
        })();
        return () => {
            cancelled = true;
        };
    }, [loadReport]);

    const syncStatus = report?.status.syncStatus;
    const state = syncState(syncStatus);

    useEffect(() => {
        if (phase === 'qr' || phase === 'boot') return;
        let cancelled = false;
        let timer: ReturnType<typeof setInterval> | undefined;

        const tick = async () => {
            const result = await loadReport();
            if (cancelled || !result) return;
            setPhase('report');
            if (result.status.syncStatus === 'done' || result.status.syncStatus === 'error') {
                if (timer) clearInterval(timer);
            }
        };

        void tick();
        timer = setInterval(() => void tick(), 3000);
        return () => {
            cancelled = true;
            if (timer) clearInterval(timer);
        };
    }, [phase, loadReport]);

    return (
        <div className="relative min-h-screen bg-background px-4 py-6 sm:px-6">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] h-[50%] w-[50%] rounded-full bg-purple-500/20 blur-[120px] mix-blend-screen" />
                <div className="absolute right-[-10%] bottom-[-20%] h-[50%] w-[50%] rounded-full bg-blue-500/20 blur-[120px] mix-blend-screen" />
            </div>

            <div className="relative mx-auto w-full max-w-3xl space-y-4">
                {phase === 'boot' && (
                    <SectionCard title="收礼报告" accent="bg-primary" bodyClassName="px-4 py-10">
                        <EmptyState
                            icon={<Loader2 className="h-6 w-6 animate-spin text-primary" />}
                            title="正在恢复会话"
                        />
                    </SectionCard>
                )}

                {phase === 'qr' && (
                    <SectionCard title="收礼报告" accent="bg-primary" bodyClassName="px-4 py-5">
                        <p className="mb-4 text-center text-sm text-muted-foreground">
                            用哔哩哔哩 App 扫码，生成今年 1 月 1 日到昨天的收礼报告。
                        </p>
                        <BiliQrPanel
                            autoStart
                            generate={generateQr}
                            poll={pollQr}
                            onSuccess={() => setPhase('waiting')}
                        />
                    </SectionCard>
                )}

                {phase === 'waiting' && (
                    <SectionCard title="正在生成报告" accent="bg-primary" bodyClassName="px-4 py-10">
                        <EmptyState
                            icon={<Loader2 className="h-6 w-6 animate-spin text-primary" />}
                            title={report?.status.syncStatus === 'queued' ? '正在排队' : '正在拉取礼物流水'}
                            description="采集端按顺序翻页，通常需要几分钟。请将页面开着。"
                        />
                    </SectionCard>
                )}

                {phase === 'report' && report && (
                    <>
                        <SectionCard
                            title={
                                <>
                                    {report.uname ? `${report.uname} 的收礼报告` : '收礼报告'}
                                    <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${state.className}`}>
                                        {state.label}
                                    </span>
                                </>
                            }
                            accent="bg-primary"
                            actions={
                                <>
                                <AnalyticsDateRangePicker
                                    date={dateRange}
                                    setDate={(next) => setDateRange(next ?? defaultDateRange())}
                                />
                                {report.hasLiveAuth ? (
                                    <Button type="button" variant="outline" className="h-9 rounded-lg" onClick={() => { window.location.href = '/dashboard'; }}>
                                        进入看板
                                    </Button>
                                ) : null}
                                <form action={logout}>
                                    <Button type="submit" variant="ghost" className="h-9 rounded-lg">
                                        <LogOut className="h-4 w-4" />
                                        退出
                                    </Button>
                                </form>
                                <Button
                                    type="button"
                                    className="h-9 rounded-lg"
                                    disabled={exporting || report.status.uniqueCount === 0}
                                    onClick={async () => {
                                        setExporting(true);
                                        try {
                                            const file = await exportGiftReportCsvAction(rangeTimes.startTime, rangeTimes.endTime);
                                            if (!file.ok) {
                                                toast.error(file.message);
                                                return;
                                            }
                                            downloadCsv(file.filename, file.csv);
                                        } finally {
                                            setExporting(false);
                                        }
                                    }}
                                >
                                    {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                    导出 Excel
                                </Button>
                                </>
                            }
                            bodyClassName="px-4 py-3 text-sm text-muted-foreground"
                        >
                            统计区间可自选，默认今年 1 月 1 日到现在
                            {report.uid ? ` · UID ${report.uid}` : ''}
                            {report.status.syncFrom && report.status.syncTo
                                ? ` · 已拉取 ${formatYmd(report.status.syncFrom)} 至 ${formatYmd(report.status.syncTo)}`
                                : ''}
                            {report.status.syncStatus === 'error' ? (
                                <span className="mt-1 block text-loss">{report.status.syncError || '拉取失败'}</span>
                            ) : null}
                        </SectionCard>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <StatCard
                                label="礼物条数"
                                value={report.status.uniqueCount.toLocaleString('zh-CN')}
                                tone="sky"
                            />
                            <StatCard
                                label="税前收益"
                                value={formatCurrency(report.status.hamsterTotal / 500)}
                                sub={`${report.status.batteryTotal.toLocaleString('zh-CN')} 电池`}
                                tone="amber"
                            />
                            <StatCard
                                label="礼物种类"
                                value={report.gifts.length.toLocaleString('zh-CN')}
                                tone="purple"
                            />
                        </div>

                        {report.blindbox && (
                            <SectionCard title="心动盲盒分析" accent="bg-orange-500" bodyClassName="px-4 py-3">
                                <p className="mb-3 text-xs text-muted-foreground">
                                    按流水里的盲盒产出反推，成本 {BLINDBOX_COST} 电池/盒。爱心抱枕等也可能是直送。
                                </p>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <StatCard label="开盒次数" value={report.blindbox.totalBoxes.toLocaleString('zh-CN')} tone="orange" />
                                    <StatCard
                                        label="总投入"
                                        value={formatCurrency(report.blindbox.totalCost / 10)}
                                        sub={`${report.blindbox.totalCost.toLocaleString('zh-CN')} 电池`}
                                        tone="amber"
                                    />
                                    <StatCard
                                        label="总产出"
                                        value={formatCurrency(report.blindbox.totalOutput / 10)}
                                        sub={`${report.blindbox.totalOutput.toLocaleString('zh-CN')} 电池`}
                                        tone="sky"
                                    />
                                    <StatCard
                                        label="净盈亏"
                                        value={`${report.blindbox.netProfit >= 0 ? '+' : ''}${formatCurrency(report.blindbox.netProfit / 10)}`}
                                        sub={`${report.blindbox.profitRate.toFixed(1)}%`}
                                        tone={report.blindbox.netProfit >= 0 ? 'emerald' : 'orange'}
                                        delta={
                                            report.blindbox.netProfit >= 0
                                                ? <TrendingUp className="h-3.5 w-3.5 text-profit" />
                                                : <TrendingDown className="h-3.5 w-3.5 text-loss" />
                                        }
                                    />
                                </div>
                                {report.blindbox.distribution.some((item) => item.count > 0) ? (
                                    <table className={`${tableChrome} mt-3`}>
                                        <thead>
                                            <tr>
                                                <th>礼物</th>
                                                <th className="text-right">数量</th>
                                                <th className="text-right">单价(电池)</th>
                                                <th className="text-right">产出</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {report.blindbox.distribution.filter((item) => item.count > 0).map((item) => (
                                                <tr key={item.name}>
                                                    <td className="text-sm">{item.name}</td>
                                                    <td className="text-right tabular-nums text-sm">{item.count}</td>
                                                    <td className="text-right tabular-nums text-sm">{item.value}</td>
                                                    <td className="text-right tabular-nums text-sm text-money">
                                                        {formatCurrency(item.totalValue / 10)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : null}
                            </SectionCard>
                        )}

                        <SectionCard title="按礼物汇总" accent="bg-money" bodyClassName="overflow-auto">
                            {report.gifts.length === 0 ? (
                                <EmptyState icon={<Gift className="h-6 w-6" />} title="这段时间没有收礼记录" />
                            ) : (
                                <table className={tableChrome}>
                                    <thead>
                                        <tr>
                                            <th>礼物</th>
                                            <th className="text-right">数量</th>
                                            <th className="text-right">金仓鼠</th>
                                            <th className="text-right">金额</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.gifts.map((gift) => (
                                            <tr key={gift.giftId}>
                                                <td className="text-sm">{gift.name}</td>
                                                <td className="text-right tabular-nums text-sm">{gift.num}</td>
                                                <td className="text-right tabular-nums text-sm">{gift.hamster}</td>
                                                <td className="text-right tabular-nums text-sm text-money">
                                                    {formatCurrency(gift.hamster / 500)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </SectionCard>

                        <SectionCard title="最近记录" accent="bg-primary" bodyClassName="overflow-auto">
                            {report.recent.length === 0 ? (
                                <EmptyState icon={<Gift className="h-6 w-6" />} title="暂无明细" />
                            ) : (
                                <table className={tableChrome}>
                                    <thead>
                                        <tr>
                                            <th>时间</th>
                                            <th>用户</th>
                                            <th>礼物</th>
                                            <th className="text-right">数量</th>
                                            <th className="text-right">金额</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.recent.map((item) => (
                                            <tr key={item.id}>
                                                <td className="tabular-nums text-sm">{item.time.slice(5)}</td>
                                                <td className="truncate text-sm">{item.uname || item.uid}</td>
                                                <td className="text-sm">{item.name}</td>
                                                <td className="text-right tabular-nums text-sm">{item.num}</td>
                                                <td className="text-right tabular-nums text-sm text-money">
                                                    {formatCurrency(item.hamster / 500)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </SectionCard>


                    </>
                )}
            </div>
        </div>
    );
}
