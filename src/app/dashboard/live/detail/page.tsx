'use client';

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Clock, Coins, Gift, MessageSquare, Radio, Shield, Sparkles, Trophy, Users } from "lucide-react";
import { Table } from "@heroui/react";
import { toast } from "sonner";

import { getSessionDetail } from "../actions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RankingList } from "@/components/dashboard/RankingList";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListPager, useClientPager } from "@/components/shared/ListPager";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Tab, TabList, TabPanel, Tabs } from "@/components/shared/tabs";
import { tableChrome } from "@/components/shared/table";
import { formatCurrency, formatDateTime, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

type SessionDetailData = Awaited<ReturnType<typeof getSessionDetail>>;

const VISIBLE_GIFT_PILLS = 4;

export default function SessionDetailPage() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <SessionDetailContent />
        </Suspense>
    );
}

function guardLevelName(level: number | null) {
    if (level === 1) return '总督';
    if (level === 2) return '提督';
    return '舰长';
}

function guardLevelColor(level: number | null) {
    if (level === 1) return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
    if (level === 2) return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
    return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
}

function SessionDetailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [data, setData] = useState<SessionDetailData | null>(null);
    const [loadedKey, setLoadedKey] = useState("");
    const [mainTab, setMainTab] = useState<string>("gifts");
    const [rankTab, setRankTab] = useState<"gifts" | "danmaku">("gifts");
    const requestIdRef = useRef(0);

    const startTs = Number(searchParams.get('start') || 0);
    const endTs = Number(searchParams.get('end') || 0);
    const title = searchParams.get('title') || '直播场次复盘';
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
                if (requestId === requestIdRef.current) toast.error('无法加载场次详情，请返回后重试');
            });
        return () => {
            if (requestId === requestIdRef.current) requestIdRef.current += 1;
        };
    }, [startTs, endTs, requestKey]);

    const giftPager = useClientPager(data?.giftUsers ?? [], 15);
    const scPager = useClientPager(data?.superChats ?? [], 15);
    const guardPager = useClientPager(data?.guards ?? [], 15);
    const danmakuPager = useClientPager(data?.danmakuList ?? [], 20);

    if (!startTs) {
        return (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center p-8 text-center">
                <EmptyState
                    title="未指定场次时间参数"
                    description="请从「开播记录」或「周报」场次列表中点击进入。"
                />
            </div>
        );
    }

    if (!data || loadedKey !== requestKey) {
        return <LoadingScreen />;
    }

    const durationMin = endTs ? Math.round((endTs - startTs) / 60000) : 0;
    const maxUserValue = Math.max(...data.giftUsers.map((user) => user.totalValue), 1);
    const isOngoing = !endTs;

    return (
        <div className="min-w-0 space-y-4 pb-8">
            <PageHeader
                icon={<Radio className="h-5 w-5" />}
                iconClass="bg-emerald-500/15 text-emerald-500"
                title={title}
                description={
                    <span className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono text-muted-foreground">
                            {formatDateTime(startTs)} ~ {endTs ? formatDateTime(endTs).split(" ")[1] : "直播中"}
                        </span>
                        <span className="text-border">•</span>
                        <span className="font-semibold text-foreground">
                            {isOngoing ? (
                                <span className="inline-flex items-center gap-1.5 text-emerald-500">
                                    <span className="relative flex h-2 w-2">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                    </span>
                                    正在直播中
                                </span>
                            ) : (
                                `时长 ${formatDuration(durationMin)}`
                            )}
                        </span>
                        {data.broadcaster?.uname && (
                            <>
                                <span className="text-border">•</span>
                                <span className="text-muted-foreground">主播: {data.broadcaster.uname}</span>
                            </>
                        )}
                    </span>
                }
                actions={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.back()}
                        className="h-8 gap-1.5 rounded-lg border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-accent"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>返回上一页</span>
                    </Button>
                }
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                    label="本场总营收"
                    value={formatCurrency(data.stats.totalIncome)}
                    icon={<Coins className="h-4 w-4 text-amber-500" />}
                    tone="amber"
                    sub={`礼物 ${formatCurrency(data.stats.giftIncome)} · 舰长 ${formatCurrency(data.stats.guardIncome)} · SC ${formatCurrency(data.stats.scIncome)}`}
                />
                <StatCard
                    label="弹幕互动总量"
                    value={`${data.danmakuCount.toLocaleString()} 条`}
                    icon={<MessageSquare className="h-4 w-4 text-sky-500" />}
                    tone="sky"
                    sub={durationMin > 0 ? `互动密度 ${Math.round(data.danmakuCount / (durationMin / 60))} 条/小时` : "暂无数据"}
                />
                <StatCard
                    label="送礼互动人次"
                    value={`${data.giftUsers.length} 位`}
                    icon={<Gift className="h-4 w-4 text-pink-500" />}
                    tone="pink"
                    sub={`共产生 ${data.stats.giftCount} 件礼物`}
                />
                <StatCard
                    label="大航海与 SC"
                    value={`${data.guards.length} 舰 · ${data.superChats.length} SC`}
                    icon={<Shield className="h-4 w-4 text-indigo-500" />}
                    tone="indigo"
                    sub={`高价值互动用户 ${(data.guards.length + data.superChats.length)} 位`}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <Tabs
                    selectedKey={mainTab}
                    onSelectionChange={(k) => setMainTab(String(k))}
                    className="flex h-[560px] xl:h-[620px] min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs lg:col-span-7"
                >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/60 px-4 py-2.5 shrink-0">
                        <TabList aria-label="场次明细切换">
                            <Tab id="gifts">
                                <Gift className="h-3.5 w-3.5" />
                                <span>礼物明细 ({data.giftUsers.length})</span>
                            </Tab>
                            <Tab id="sc">
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>醒目留言 SC ({data.superChats.length})</span>
                            </Tab>
                            <Tab id="guards">
                                <Shield className="h-3.5 w-3.5" />
                                <span>大航海上舰 ({data.guards.length})</span>
                            </Tab>
                            <Tab id="danmaku">
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>弹幕流 ({data.danmakuList.length})</span>
                            </Tab>
                        </TabList>
                    </div>

                    <TabPanel id="gifts" className="flex min-h-0 flex-1 flex-col">
                        {data.giftUsers.length === 0 ? (
                            <div className="flex flex-1 items-center justify-center">
                                <EmptyState title="本场暂无礼物记录" description="直播期间观众送出的礼物将汇总在此处。" />
                            </div>
                        ) : (
                            <>
                                <div className="dark-scrollbar flex-1 min-h-0 overflow-auto">
                                    <Table variant="secondary" className="w-full">
                                        <Table.ScrollContainer className="w-full">
                                            <Table.Content aria-label="礼物明细" className={`${tableChrome} min-w-[560px]`}>
                                                <Table.Header>
                                                    <Table.Column id="user" isRowHeader className="w-[180px] pl-4">送礼用户</Table.Column>
                                                    <Table.Column id="gifts">礼物详情</Table.Column>
                                                    <Table.Column id="value" className="w-[130px] pr-4 text-right">总价值</Table.Column>
                                                </Table.Header>
                                                <Table.Body>
                                                    {giftPager.slice.map((user) => (
                                                        <Table.Row key={user.uname} id={user.uname} className="hover:bg-accent/40 transition-colors">
                                                            <Table.Cell className="pl-4">
                                                                <div className="flex items-center gap-2 truncate">
                                                                    <Avatar src={user.uface} name={user.uname} className="h-7 w-7 shrink-0 border border-border" />
                                                                    <span className="truncate text-xs font-semibold text-foreground" title={user.uname}>
                                                                        {user.uname}
                                                                    </span>
                                                                </div>
                                                            </Table.Cell>
                                                            <Table.Cell>
                                                                <GiftCell gifts={user.gifts} />
                                                            </Table.Cell>
                                                            <Table.Cell className="pr-4 text-right">
                                                                <div className="font-mono font-bold text-xs text-money">
                                                                    {formatCurrency(user.totalValue)}
                                                                </div>
                                                                <div className="mt-1 ml-auto h-1 w-full max-w-[80px] overflow-hidden rounded-full bg-muted">
                                                                    <div
                                                                        className="h-full rounded-full bg-primary/70"
                                                                        style={{ width: `${Math.max(4, Math.round((user.totalValue / maxUserValue) * 100))}%` }}
                                                                    />
                                                                </div>
                                                            </Table.Cell>
                                                        </Table.Row>
                                                    ))}
                                                </Table.Body>
                                            </Table.Content>
                                        </Table.ScrollContainer>
                                    </Table>
                                </div>

                                {data.giftUsers.length > 15 && (
                                    <ListPager
                                        total={giftPager.total}
                                        page={giftPager.page}
                                        pageCount={giftPager.pageCount}
                                        pageSize={giftPager.pageSize}
                                        onPageChange={giftPager.setPage}
                                        onPageSizeChange={giftPager.setPageSize}
                                    />
                                )}
                            </>
                        )}
                    </TabPanel>

                    <TabPanel id="sc" className="flex min-h-0 flex-1 flex-col">
                        {data.superChats.length === 0 ? (
                            <div className="flex flex-1 items-center justify-center">
                                <EmptyState title="本场暂无 SC 记录" description="直播期间的醒目留言将展示在此处。" />
                            </div>
                        ) : (
                            <>
                                <div className="dark-scrollbar flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                                    {scPager.slice.map((sc, i) => (
                                        <div key={`${sc.uname}-${sc.ts}-${i}`} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Avatar src={sc.uface} name={sc.uname} className="h-6 w-6 shrink-0 border border-border" />
                                                    <span className="truncate text-xs font-bold text-foreground">{sc.uname}</span>
                                                    <span className="font-mono text-[10px] text-muted-foreground">{formatDateTime(sc.ts).split(" ")[1]}</span>
                                                </div>
                                                <span className="font-mono font-bold text-xs text-money">{formatCurrency(sc.rmb)}</span>
                                            </div>
                                            <p className="break-all text-xs leading-relaxed text-foreground/90 bg-background/60 rounded-lg p-2.5 border border-border/40">
                                                {sc.message || '(无留言内容)'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                {data.superChats.length > 15 && (
                                    <ListPager
                                        total={scPager.total}
                                        page={scPager.page}
                                        pageCount={scPager.pageCount}
                                        pageSize={scPager.pageSize}
                                        onPageChange={scPager.setPage}
                                        onPageSizeChange={scPager.setPageSize}
                                    />
                                )}
                            </>
                        )}
                    </TabPanel>

                    <TabPanel id="guards" className="flex min-h-0 flex-1 flex-col">
                        {data.guards.length === 0 ? (
                            <div className="flex flex-1 items-center justify-center">
                                <EmptyState title="本场暂无上舰记录" description="直播期间上舰的用户将展示在此处。" />
                            </div>
                        ) : (
                            <>
                                <div className="dark-scrollbar flex-1 min-h-0 overflow-y-auto divide-y divide-border/60">
                                    {guardPager.slice.map((guard, i) => (
                                        <div key={`${guard.uname}-${guard.ts}-${i}`} className="flex items-center justify-between p-3.5 px-4 hover:bg-accent/40 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Avatar src={guard.uface} name={guard.uname} className="h-8 w-8 shrink-0 border border-border" />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="truncate text-xs font-bold text-foreground">{guard.uname}</span>
                                                        <span className={cn("px-1.5 py-0.2 rounded text-[10px] font-bold border", guardLevelColor(guard.guardLevel))}>
                                                            {guardLevelName(guard.guardLevel)}
                                                        </span>
                                                    </div>
                                                    <div className="font-mono text-[10px] text-muted-foreground pt-0.5">
                                                        {formatDateTime(guard.ts)}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="font-mono font-bold text-xs text-money">{formatCurrency(guard.price)}</span>
                                        </div>
                                    ))}
                                </div>
                                {data.guards.length > 15 && (
                                    <ListPager
                                        total={guardPager.total}
                                        page={guardPager.page}
                                        pageCount={guardPager.pageCount}
                                        pageSize={guardPager.pageSize}
                                        onPageChange={guardPager.setPage}
                                        onPageSizeChange={guardPager.setPageSize}
                                    />
                                )}
                            </>
                        )}
                    </TabPanel>

                    <TabPanel id="danmaku" className="flex min-h-0 flex-1 flex-col">
                        {data.danmakuList.length === 0 ? (
                            <div className="flex flex-1 items-center justify-center">
                                <EmptyState title="本场暂无弹幕记录" description="弹幕将在开播期间自动同步。" />
                            </div>
                        ) : (
                            <>
                                <div className="dark-scrollbar flex-1 min-h-0 overflow-y-auto divide-y divide-border/60">
                                    {danmakuPager.slice.map((d, i) => (
                                        <div key={`${d.uname}-${d.ts}-${i}`} className="flex items-start justify-between gap-3 p-3 px-4 hover:bg-accent/40 transition-colors">
                                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                                <Avatar src={d.uface} name={d.uname} className="h-6 w-6 shrink-0 mt-0.5 border border-border" />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="truncate text-xs font-semibold text-foreground">{d.uname}</span>
                                                        <span className="font-mono text-[10px] text-muted-foreground">{formatDateTime(d.ts).split(" ")[1]}</span>
                                                    </div>
                                                    <p className="text-xs text-foreground/85 break-all pt-0.5">{d.msg}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {data.danmakuList.length > 20 && (
                                    <ListPager
                                        total={danmakuPager.total}
                                        page={danmakuPager.page}
                                        pageCount={danmakuPager.pageCount}
                                        pageSize={danmakuPager.pageSize}
                                        onPageChange={danmakuPager.setPage}
                                        onPageSizeChange={danmakuPager.setPageSize}
                                    />
                                )}
                            </>
                        )}
                    </TabPanel>
                </Tabs>

                <div className="flex h-[560px] xl:h-[620px] min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs lg:col-span-5">
                    <div className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-2 shrink-0">
                        <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
                            <button
                                type="button"
                                aria-pressed={rankTab === "gifts"}
                                onClick={() => setRankTab("gifts")}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                                    rankTab === "gifts"
                                        ? "bg-card text-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                                <span>礼物贡献榜 ({data.topGifts.length})</span>
                            </button>
                            <button
                                type="button"
                                aria-pressed={rankTab === "danmaku"}
                                onClick={() => setRankTab("danmaku")}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                                    rankTab === "danmaku"
                                        ? "bg-card text-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <MessageSquare className="h-3.5 w-3.5 text-sky-500" />
                                <span>弹幕活跃榜 ({data.topDanmaku.length})</span>
                            </button>
                        </div>
                    </div>

                    {rankTab === "gifts" ? (
                        <RankingList
                            items={data.topGifts.map((g) => ({
                                uname: g.uname,
                                uface: g.uface,
                                value: g.total,
                                label: formatCurrency(g.total),
                            }))}
                            tone="amber"
                            emptyTitle="本场暂无礼物排行"
                            className="flex-1 min-h-0"
                        />
                    ) : (
                        <RankingList
                            items={data.topDanmaku.map((d) => ({
                                uname: d.uname,
                                uface: d.uface,
                                value: d.count,
                                label: `${d.count} 条`,
                            }))}
                            tone="sky"
                            emptyTitle="本场暂无弹幕排行"
                            className="flex-1 min-h-0"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

type GiftEntry = { name: string; count: number; value: number; icon: string };

function GiftCell({ gifts }: { gifts: GiftEntry[] }) {
    const [expanded, setExpanded] = useState(false);
    const visible = expanded ? gifts : gifts.slice(0, VISIBLE_GIFT_PILLS);
    const hidden = gifts.length - VISIBLE_GIFT_PILLS;

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {visible.map((gift) => (
                <GiftPill key={gift.name} gift={gift} />
            ))}
            {hidden > 0 && (
                <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    className="inline-flex h-6 items-center rounded-md border border-dashed border-border px-2 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                    {expanded ? '收起' : `+${hidden}`}
                </button>
            )}
        </div>
    );
}

function GiftPill({ gift }: { gift: GiftEntry }) {
    const [failed, setFailed] = useState(false);

    return (
        <span className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-accent/60 px-2 text-[11px] text-foreground">
            {gift.icon && !failed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={gift.icon}
                    alt={gift.name}
                    className="h-3.5 w-3.5 shrink-0 object-contain"
                    referrerPolicy="no-referrer"
                    onError={() => setFailed(true)}
                />
            ) : (
                <Gift className="h-3 w-3 text-pink-500 shrink-0" />
            )}
            <span className="max-w-[120px] truncate">{gift.name}</span>
            <span className="font-mono text-muted-foreground">x{gift.count}</span>
            <span className="font-mono font-bold text-money">{formatCurrency(gift.value)}</span>
        </span>
    );
}
