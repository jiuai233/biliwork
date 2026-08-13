'use client';

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift } from "@/lib/types";
import { Gift as GiftIcon } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface GiftPanelProps {
    data: Gift[];
    className?: string;
}

type GiftRow = Gift & { combo: number };

/** Merge adjacent rows from the same user sending the same gift within 90s into a combo row. */
function mergeCombos(data: Gift[]): GiftRow[] {
    const rows: GiftRow[] = [];
    for (const item of data) {
        const last = rows[rows.length - 1];
        const closeInTime = last?.ts && item.ts && Math.abs(last.ts - item.ts) <= 90_000;
        if (last && closeInTime && last.uname === item.uname && last.gift_name === item.gift_name && last.r_price === item.r_price) {
            last.combo += item.gift_num;
        } else {
            rows.push({ ...item, combo: item.gift_num });
        }
    }
    return rows;
}

export function GiftPanel({ data, className }: GiftPanelProps) {
    const rows = useMemo(() => mergeCombos(data), [data]);

    return (
        <div className={cn("dark-scrollbar h-[420px] w-full overflow-y-auto", className)}>
            <AnimatePresence initial={false}>
                {rows.map((item) => {
                    const totalCny = (item.r_price * item.combo) / 1000;
                    return (
                        <motion.div
                            key={item.msg_id || item.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "flex h-9 items-center gap-2.5 border-b border-border/60 px-4 last:border-b-0 hover:bg-accent/40",
                                totalCny >= 30 && "border-l-2 border-l-amber-400/50",
                            )}
                        >
                            <span className="w-14 shrink-0 text-[11px] text-muted-foreground tabular-nums">
                                {item.ts ? new Date(item.ts).toLocaleTimeString("zh-CN", { hour12: false }) : "-"}
                            </span>
                            <Avatar src={item.uface} name={item.uname} className="h-6 w-6" />
                            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{item.uname}</span>
                            <span className="shrink-0 text-[13px] text-secondary-foreground">
                                {item.gift_name} <span className="font-semibold text-muted-foreground">x{item.combo}</span>
                            </span>
                            <span className="w-16 shrink-0 text-right text-[13px] font-bold text-money tabular-nums">
                                {formatCurrency(totalCny)}
                            </span>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
            {rows.length === 0 && (
                <EmptyState
                    icon={<GiftIcon className="h-10 w-10" />}
                    title="暂无礼物记录"
                    description="快去直播间收获第一份礼物吧"
                    className="h-[340px]"
                />
            )}
        </div>
    );
}
