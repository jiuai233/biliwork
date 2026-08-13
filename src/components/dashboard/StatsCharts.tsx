'use client';

import { useState } from "react";
import { SectionCard } from "@/components/shared/SectionCard";
import { Tabs, Tab, TabList, TabPanel } from "@/components/shared/tabs";
import { RankingList } from "@/components/dashboard/RankingList";
import { Gift, MessageSquareText, Trophy } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface StatsChartsProps {
    danmakuTop: { uname: string; count: number; uface: string }[];
    giftTop: { uname: string; total: number; uface: string }[];
    className?: string;
}

export function StatsCharts({ danmakuTop, giftTop, className }: StatsChartsProps) {
    const danmakuItems = danmakuTop.map((item) => ({
        uname: item.uname,
        uface: item.uface,
        value: item.count,
        label: `${item.count} 条`,
    }));
    const giftItems = giftTop.map((item) => ({
        uname: item.uname,
        uface: item.uface,
        value: item.total,
        label: formatCurrency(item.total),
    }));
    const danmakuTotal = danmakuItems.reduce((sum, item) => sum + item.value, 0);
    const giftTotal = giftItems.reduce((sum, item) => sum + item.value, 0);

    const [selected, setSelected] = useState<string>(
        danmakuItems.length === 0 && giftItems.length > 0 ? "gift" : "danmaku",
    );
    const isGift = selected === "gift";

    return (
        <Tabs
            selectedKey={selected}
            onSelectionChange={(key) => setSelected(String(key))}
            className={cn("flex min-h-0 flex-col", className)}
        >
            <SectionCard
                className="flex min-h-0 flex-1 flex-col"
                bodyClassName="flex min-h-0 flex-1 flex-col"
                title={
                    <span className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                            <Trophy className="h-4 w-4" />
                        </span>
                        <span>{isGift ? "礼物贡献榜" : "弹幕活跃榜"}</span>
                        <span className="text-xs font-normal text-muted-foreground">
                            {(isGift ? giftItems : danmakuItems).length} 位
                        </span>
                    </span>
                }
                actions={
                    <TabList aria-label="排行榜切换">
                        <Tab id="danmaku">
                            <MessageSquareText className="h-3.5 w-3.5" />
                            弹幕榜
                        </Tab>
                        <Tab id="gift">
                            <Gift className="h-3.5 w-3.5" />
                            礼物榜
                        </Tab>
                    </TabList>
                }
            >
                <TabPanel id="danmaku" className="flex min-h-0 flex-1 flex-col">
                    <RankingList items={danmakuItems} totalLabel={`累计 ${danmakuTotal} 条弹幕`} />
                </TabPanel>
                <TabPanel id="gift" className="flex min-h-0 flex-1 flex-col">
                    <RankingList items={giftItems} totalLabel={`累计 ${formatCurrency(giftTotal)}`} />
                </TabPanel>
            </SectionCard>
        </Tabs>
    );
}
