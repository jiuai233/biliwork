'use client';

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getSessionDetail } from "../actions";
import { ArrowLeft, MessageSquare, Gift, Shield, Sparkles, Clock } from "lucide-react";
import { Table } from "@heroui/react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { RankingList } from "@/components/dashboard/RankingList";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatCard, type StatTone } from "@/components/shared/StatCard";
import { tableChrome } from "@/components/shared/table";
import { Tabs, Tab, TabList, TabPanel } from "@/components/shared/tabs";
import { formatDuration } from "@/lib/format";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type SessionDetailData = Awaited<ReturnType<typeof getSessionDetail>>;

/** Rows show at most this many gift pills before collapsing behind "+N". */
const VISIBLE_GIFT_PILLS = 6;

export default function SessionDetailPage() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <SessionDetailContent />
        </Suspense>
    );
}

function formatTime(ts: number | null) {
    if (!ts) return '-';
    return format(new Date(ts), 'MM-dd HH:mm:ss');
}

function guardLevelName(level: number | null) {
    if (level === 1) return '总督';
    if (level === 2) return '提督';
    return '舰长';
}

function guardLevelColor(level: number | null) {
    if (level === 1) return 'text-amber-400';
    if (level === 2) return 'text-purple-400';
    return 'text-blue-400';
}

function SessionDetailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [data, setData] = useState<SessionDetailData | null>(null);
    const [loadedKey, setLoadedKey] = useState("");
    const requestIdRef = useRef(0);

    const startTs = Number(searchParams.get('start') || 0);
    const endTs = Number(searchParams.get('end') || 0);
    const title = searchParams.get('title') || '直播场次';
    const requestKey = `${startTs}:${endTs}`;

    useEffect(() => {
        if (!startTs) return;
        const requestId = ++requestIdRef.current;
        getSessionDetail(startTs, endTs || Date.now())
            .then((result) => {
                if (requestId === requestIdRef.current) {
                    setData(result);
                    setLoadedKey(requestKey);
                }
            })
            .catch(() => {
                if (requestId === requestIdRef.current) toast.error('获取详情失败');
            });
        return () => {
            if (requestId === requestIdRef.current) requestIdRef.current += 1;
        };
    }, [startTs, endTs, requestKey]);

    if (!data || loadedKey !== requestKey) {
        return <LoadingScreen />;
    }

    const duration = endTs ? Math.round((endTs - startTs) / 60000) : 0;
    const maxUserValue = Math.max(...data.giftUsers.map((user) => user.totalValue), 1);

    const statItems: { icon: React.ReactNode; label: string; value: string; tone: StatTone }[] = [
        { icon: <MessageSquare className="h-4 w-4" />, label: "弹幕", value: data.danmakuCount.toString(), tone: "blue" },
        { icon: <Gift className="h-4 w-4" />, label: "礼物收入", value: `${data.stats.totalIncome.toFixed(1)} ¥`, tone: "amber" },
        { icon: <Gift className="h-4 w-4" />, label: "礼物", value: data.stats.giftCount.toString(), tone: "pink" },
        { icon: <Shield className="h-4 w-4" />, label: "上舰", value: data.stats.guardCount.toString(), tone: "indigo" },
        { icon: <Sparkles className="h-4 w-4" />, label: "SC", value: data.stats.scCount.toString(), tone: "yellow" },
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 md:flex-row md:items-center">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.back()}
                        aria-label="返回"
                        className="h-9 w-9 border-border bg-accent/50 p-0 hover:bg-accent"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-xl font-bold text-foreground md:text-2xl">{title}</h2>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {formatTime(startTs)} ~ {endTs ? formatTime(endTs) : '进行中'}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                            <span>{endTs ? formatDuration(duration) : '直播中'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {statItems.map((item) => (
                    <StatCard key={item.label} label={item.label} value={item.value} icon={item.icon} tone={item.tone} className="min-h-0 p-3" />
                ))}
            </div>

            <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
                <SectionCard
                    title="礼物明细（按用户）"
                    accent="bg-pink-500"
                    className="flex min-h-[620px] flex-col xl:h-[720px]"
                    bodyClassName="min-h-0 flex-1 p-3"
                >
                    <div className="dark-scrollbar h-full min-h-0 overflow-auto rounded-lg">
                        <Table variant="secondary" className="min-w-[760px]">
                            <Table.Content aria-label="礼物明细" className={tableChrome}>
                                <Table.Header>
                                    <Table.Column id="rank" isRowHeader className="w-[60px]">#</Table.Column>
                                    <Table.Column id="user" className="w-[220px]">用户</Table.Column>
                                    <Table.Column id="gifts">礼物详情</Table.Column>
                                    <Table.Column id="value" className="w-[130px] text-right">总价值</Table.Column>
                                </Table.Header>
                                <Table.Body>
                                    {data.giftUsers.map((user, i) => (
                                        <Table.Row key={user.uname} id={user.uname}>
                                            <Table.Cell className="font-mono text-muted-foreground">{i + 1}</Table.Cell>
                                            <Table.Cell>
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <Avatar src={user.uface} name={user.uname} className="h-7 w-7" />
                                                    <span className="truncate text-sm font-medium text-foreground">{user.uname}</span>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <GiftCell gifts={user.gifts} />
                                            </Table.Cell>
                                            <Table.Cell className="text-right">
                                                <span className="font-bold text-amber-400 tabular-nums">{user.totalValue.toFixed(1)} ¥</span>
                                                <div className="mt-1 ml-auto h-1 w-full max-w-[96px] overflow-hidden rounded-full bg-muted">
                                                    <div
                                                        className="h-full rounded-full bg-amber-400/70"
                                                        style={{ width: `${Math.max(4, Math.round((user.totalValue / maxUserValue) * 100))}%` }}
                                                    />
                                                </div>
                                            </Table.Cell>
                                        </Table.Row>
                                    ))}
                                    {data.giftUsers.length === 0 && (
                                        <Table.Row id="empty">
                                            <Table.Cell colSpan={4} className="py-20 text-center text-muted-foreground">
                                                本场无礼物记录
                                            </Table.Cell>
                                        </Table.Row>
                                    )}
                                </Table.Body>
                            </Table.Content>
                        </Table>
                    </div>
                </SectionCard>

                <Tabs defaultSelectedKey="sc" className="flex min-h-[620px] min-w-0 flex-col xl:h-[720px]">
                    <SectionCard
                        className="flex min-h-0 flex-1 flex-col overflow-hidden"
                        bodyClassName="flex min-h-0 flex-1 flex-col"
                    >
                        <div className="shrink-0 border-b border-border px-3 py-2">
                            <TabList aria-label="场次记录切换">
                                <Tab id="sc">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    SC {data.superChats.length}
                                </Tab>
                                <Tab id="guards">
                                    <Shield className="h-3.5 w-3.5" />
                                    上舰 {data.guards.length}
                                </Tab>
                                <Tab id="danmaku-rank">
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    弹幕榜
                                </Tab>
                            </TabList>
                        </div>

                        <TabPanel id="sc" className="flex min-h-0 flex-1 flex-col">
                            <div className="dark-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
                                <div className="space-y-3">
                                    {data.superChats.map((sc, i) => (
                                        <div key={`${sc.uname}-${sc.ts}-${i}`} className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                                            <div className="mb-1.5 flex items-center justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <Avatar src={sc.uface} name={sc.uname} className="h-6 w-6" />
                                                    <span className="truncate text-sm text-secondary-foreground">{sc.uname}</span>
                                                </div>
                                                <span className="shrink-0 text-sm font-bold text-yellow-400 tabular-nums">¥{sc.rmb}</span>
                                            </div>
                                            <p className="break-all text-xs leading-5 text-foreground/80">{sc.message || '(无内容)'}</p>
                                        </div>
                                    ))}
                                    {data.superChats.length === 0 && <PanelEmpty>本场无 SC</PanelEmpty>}
                                </div>
                            </div>
                        </TabPanel>

                        <TabPanel id="guards" className="flex min-h-0 flex-1 flex-col">
                            <div className="dark-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
                                <div className="space-y-2">
                                    {data.guards.map((guard, i) => (
                                        <div key={`${guard.uname}-${guard.ts}-${i}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-accent/30 p-3">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <Avatar src={guard.uface} name={guard.uname} className="h-7 w-7" />
                                                <span className="truncate text-sm text-secondary-foreground">{guard.uname}</span>
                                                <span className={cn("shrink-0 text-xs font-medium", guardLevelColor(guard.guardLevel))}>
                                                    {guardLevelName(guard.guardLevel)}
                                                </span>
                                            </div>
                                            <span className="shrink-0 text-sm font-bold text-blue-400 tabular-nums">¥{guard.price.toFixed(0)}</span>
                                        </div>
                                    ))}
                                    {data.guards.length === 0 && <PanelEmpty>本场无上舰</PanelEmpty>}
                                </div>
                            </div>
                        </TabPanel>

                        <TabPanel id="danmaku-rank" className="flex min-h-0 flex-1 flex-col">
                            {data.topDanmaku.length > 0 ? (
                                <RankingList
                                    items={data.topDanmaku.map((user) => ({
                                        uname: user.uname,
                                        uface: user.uface,
                                        value: user.count,
                                        label: `${user.count} 条`,
                                    }))}
                                    barClass="bg-blue-400"
                                />
                            ) : (
                                <PanelEmpty>本场无弹幕</PanelEmpty>
                            )}
                        </TabPanel>
                    </SectionCard>
                </Tabs>
            </div>
        </div>
    );
}

type GiftEntry = { name: string; count: number; value: number; icon: string };

/** Pills beyond the fold collapse behind a "+N" toggle to keep rows scannable. */
function GiftCell({ gifts }: { gifts: GiftEntry[] }) {
    const [expanded, setExpanded] = useState(false);
    const visible = expanded ? gifts : gifts.slice(0, VISIBLE_GIFT_PILLS);
    const hidden = gifts.length - VISIBLE_GIFT_PILLS;

    return (
        <div className="flex flex-wrap items-center gap-2">
            {visible.map((gift) => (
                <GiftPill key={gift.name} gift={gift} />
            ))}
            {hidden > 0 && (
                <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    className="inline-flex min-h-7 items-center rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                    {expanded ? '收起' : `+${hidden} 项`}
                </button>
            )}
        </div>
    );
}

function GiftPill({ gift }: { gift: GiftEntry }) {
    const [failed, setFailed] = useState(false);

    return (
        <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-border bg-accent px-2.5 py-1 text-xs text-secondary-foreground">
            {gift.icon && !failed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={gift.icon}
                    alt={gift.name}
                    className="h-4 w-4 shrink-0 object-contain"
                    referrerPolicy="no-referrer"
                    onError={() => setFailed(true)}
                />
            ) : (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-muted">
                    <Gift className="h-3 w-3 text-muted-foreground" />
                </span>
            )}
            <span className="max-w-[160px] truncate">{gift.name}</span>
            <span className="text-muted-foreground">x{gift.count}</span>
            <span className="font-medium text-amber-400">{gift.value.toFixed(1)}¥</span>
        </span>
    );
}

function PanelEmpty({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            {children}
        </div>
    );
}
