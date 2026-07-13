'use client';

import { motion } from "framer-motion";
import { Guard } from "@/lib/types";
import { Anchor } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

interface GuardPanelProps {
    data: Guard[];
    className?: string;
}

const guardMeta: Record<number, { name: string; badge: string; border: string }> = {
    1: { name: "总督", badge: "border-amber-500/40 bg-amber-500/10 text-amber-400", border: "border-amber-500" },
    2: { name: "提督", badge: "border-violet-500/40 bg-violet-500/10 text-violet-400", border: "border-violet-500" },
    3: { name: "舰长", badge: "border-blue-500/40 bg-blue-500/10 text-blue-400", border: "border-blue-500" },
};

function getGuardMeta(level?: number | null) {
    return guardMeta[level ?? 3] ?? guardMeta[3];
}

export function GuardPanel({ data, className }: GuardPanelProps) {
    return (
        <div className={cn("dark-scrollbar h-[290px] w-full overflow-y-auto", className)}>
            {data.map((item) => {
                const meta = getGuardMeta(item.guard_level);
                return (
                    <motion.div
                        key={item.msg_id || item.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex h-12 items-center gap-2.5 border-b border-border/60 px-4 last:border-b-0 hover:bg-accent/40"
                    >
                        <Avatar src={item.uface} name={item.uname} className={cn("h-7 w-7 border", meta.border)} />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{item.uname}</span>
                        <Badge className={cn("shrink-0 text-[11px]", meta.badge)}>{meta.name}</Badge>
                        <span className="shrink-0 text-[13px] text-secondary-foreground">
                            x<span className="font-bold text-foreground">{item.guard_num}</span> {item.guard_unit}
                        </span>
                        <span className="w-16 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">
                            {item.ts ? new Date(item.ts).toLocaleDateString("zh-CN") : "-"}
                        </span>
                    </motion.div>
                );
            })}
            {data.length === 0 && (
                <EmptyState
                    icon={<Anchor className="h-10 w-10" />}
                    title="暂无上舰记录"
                    description="努力直播，粉丝会上舰支持你的"
                    className="h-[210px]"
                />
            )}
        </div>
    );
}
