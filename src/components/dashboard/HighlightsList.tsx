'use client';

import { useEffect, useMemo, useState } from "react";
import { Pin, PinOff, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/EmptyState";
import { Gift, Guard, SuperChat } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Gifts at or above this CNY value are surfaced as highlights. */
export const BIG_GIFT_CNY = 30;

const AMOUNT_FILTERS = [
    { value: 0, label: "全部" },
    { value: 30, label: "¥30+" },
    { value: 100, label: "¥100+" },
    { value: 500, label: "¥500+" },
] as const;

interface HighlightsListProps {
    superChats: SuperChat[];
    guards: Guard[];
    gifts: Gift[];
    roomId?: number | null;
    className?: string;
}

type Highlight = {
    key: string;
    ts: number;
    kind: "sc" | "guard" | "gift";
    uname: string | null;
    uface: string | null;
    amount: number;
    detail: string;
};

type ConsoleSettings = {
    pinned: Highlight[];
    minAmount: number;
};

const DEFAULT_SETTINGS: ConsoleSettings = {
    pinned: [],
    minAmount: 0,
};

function loadSettings(storageKey: string): ConsoleSettings {
    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return DEFAULT_SETTINGS;
        const { pinned = [], minAmount = 0 } = JSON.parse(raw) as Partial<ConsoleSettings>;
        return { pinned, minAmount };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

/** Approximation of Bilibili SC tiers. */
function scTone(amount: number) {
    if (amount >= 500) return "border-red-500/40 bg-red-500/10 text-red-300";
    if (amount >= 100) return "border-orange-500/40 bg-orange-500/10 text-orange-300";
    if (amount >= 50) return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    return "border-sky-500/40 bg-sky-500/10 text-sky-300";
}

const kindMeta: Record<Highlight["kind"], { label: string; tone: string }> = {
    sc: { label: "SC", tone: "" },
    guard: { label: "上舰", tone: "border-indigo-500/40 bg-indigo-500/10 text-indigo-300" },
    gift: { label: "礼物", tone: "border-pink-500/40 bg-pink-500/10 text-pink-300" },
};

function HighlightRow({
    item,
    pinned,
    onTogglePin,
}: {
    item: Highlight;
    pinned: boolean;
    onTogglePin: (item: Highlight) => void;
}) {
    const meta = kindMeta[item.kind];
    const tone = item.kind === "sc" ? scTone(item.amount) : meta.tone;
    return (
        <div className={cn(
            "group border-b border-border/60 px-4 py-2 last:border-b-0 hover:bg-accent/40",
            pinned && "bg-amber-500/5",
        )}>
            <div className="flex items-center gap-2.5">
                <span className={cn("inline-flex min-h-6 shrink-0 items-center rounded border px-1.5 text-[11px] font-bold", tone)}>
                    {meta.label}
                </span>
                <Avatar src={item.uface} name={item.uname} className="h-5 w-5" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{item.uname}</span>
                <span className="shrink-0 text-[13px] font-bold text-money tabular-nums">{formatCurrency(item.amount)}</span>
                <span className="w-12 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">
                    {item.ts ? new Date(item.ts).toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit" }) : "-"}
                </span>
                <button
                    type="button"
                    aria-label={pinned ? "取消钉住" : "钉住"}
                    aria-pressed={pinned}
                    onClick={() => onTogglePin(item)}
                    className={cn(
                        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-amber-300",
                        pinned ? "text-amber-400" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                    )}
                >
                    {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                </button>
            </div>
            {item.detail && (
                <p className={cn(
                    "mt-1 break-all pl-[34px] text-xs leading-5",
                    item.kind === "sc" ? "text-foreground/90" : "text-muted-foreground",
                )}>
                    {item.detail}
                </p>
            )}
        </div>
    );
}

export function HighlightsList({ superChats, guards, gifts, roomId, className }: HighlightsListProps) {
    const storageKey = `biweb:console:${roomId ?? "default"}`;
    const [settings, setSettings] = useState<ConsoleSettings>(DEFAULT_SETTINGS);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        // localStorage is unavailable during SSR, so hydrate after mount
        // (and re-hydrate when the room-scoped key changes).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSettings(loadSettings(storageKey));
        setHydrated(true);
    }, [storageKey]);

    useEffect(() => {
        if (!hydrated) return;
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(settings));
        } catch { /* storage full or blocked */ }
    }, [settings, hydrated, storageKey]);

    const highlights = useMemo<Highlight[]>(() => {
        const items: Highlight[] = [];

        for (const sc of superChats) {
            items.push({
                key: `sc-${sc.msg_id || sc.id}`,
                ts: sc.ts ?? 0,
                kind: "sc",
                uname: sc.uname,
                uface: sc.uface,
                amount: sc.rmb,
                detail: sc.message ?? "",
            });
        }
        for (const guard of guards) {
            items.push({
                key: `guard-${guard.msg_id || guard.id}`,
                ts: guard.ts ?? 0,
                kind: "guard",
                uname: guard.uname,
                uface: guard.uface,
                amount: (guard.price * guard.guard_num) / 1000,
                detail: `开通${guard.guard_level === 1 ? "总督" : guard.guard_level === 2 ? "提督" : "舰长"} x${guard.guard_num}`,
            });
        }
        for (const gift of gifts) {
            const cny = (gift.r_price * gift.gift_num) / 1000;
            if (cny < BIG_GIFT_CNY) continue;
            items.push({
                key: `gift-${gift.msg_id || gift.id}`,
                ts: gift.ts ?? 0,
                kind: "gift",
                uname: gift.uname,
                uface: gift.uface,
                amount: cny,
                detail: `${gift.gift_name} x${gift.gift_num}`,
            });
        }

        return items.sort((a, b) => b.ts - a.ts);
    }, [superChats, guards, gifts]);

    const pinnedKeys = useMemo(() => new Set(settings.pinned.map((item) => item.key)), [settings.pinned]);

    const togglePin = (item: Highlight) => {
        setSettings((prev) => ({
            ...prev,
            pinned: prev.pinned.some((pinnedItem) => pinnedItem.key === item.key)
                ? prev.pinned.filter((pinnedItem) => pinnedItem.key !== item.key)
                : [item, ...prev.pinned],
        }));
    };

    const visible = highlights.filter(
        (item) => item.amount >= settings.minAmount && !pinnedKeys.has(item.key),
    );

    return (
        <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border/60 px-3 py-1.5">
                <div className="flex overflow-hidden rounded-md border border-border">
                    {AMOUNT_FILTERS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            aria-pressed={settings.minAmount === option.value}
                            onClick={() => setSettings((prev) => ({ ...prev, minAmount: option.value }))}
                            className={cn(
                                "inline-flex min-h-6 items-center border-r border-border px-2 text-[11px] font-semibold last:border-r-0",
                                settings.minAmount === option.value
                                    ? "bg-primary/20 text-primary"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div data-testid="dashboard-highlights" className="dark-scrollbar min-h-0 flex-1 overflow-y-auto">
                {settings.pinned.length > 0 && (
                    <div className="border-b-2 border-amber-500/30">
                        <div className="flex items-center gap-1 bg-amber-500/10 px-4 py-1 text-[11px] font-bold text-amber-300">
                            <Pin className="h-3 w-3" />
                            已钉住 {settings.pinned.length}
                        </div>
                        {settings.pinned.map((item) => (
                            <HighlightRow key={item.key} item={item} pinned onTogglePin={togglePin} />
                        ))}
                    </div>
                )}

                {visible.map((item) => (
                    <HighlightRow key={item.key} item={item} pinned={false} onTogglePin={togglePin} />
                ))}

                {visible.length === 0 && settings.pinned.length === 0 && (
                    <EmptyState
                        icon={<Sparkles className="h-10 w-10" />}
                        title="暂无重点事件"
                        description="SC、上舰和大额礼物会在这里汇总"
                        className="h-full min-h-[180px]"
                    />
                )}
            </div>
        </div>
    );
}
