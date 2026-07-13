'use client';

import { motion, AnimatePresence } from "framer-motion";
import { Danmaku } from "@/lib/types";
import { useEffect, useRef } from "react";
import { MessageSquareText } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

interface DanmakuPanelProps {
    data: Danmaku[];
    className?: string;
}

const guardNames: Record<number, string> = { 1: "总督", 2: "提督", 3: "舰长" };

export function DanmakuPanel({ data, className }: DanmakuPanelProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [data]);

    return (
        <div ref={scrollRef} className={cn("dark-scrollbar h-[420px] w-full overflow-y-auto", className)}>
            <AnimatePresence initial={false}>
                {data.slice().reverse().map((item) => (
                    <motion.div
                        key={item.msg_id || item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-2.5 border-b border-border/60 px-4 py-1.5 text-[13px] last:border-b-0 hover:bg-accent/40"
                    >
                        <span className="w-14 shrink-0 pt-px text-[11px] leading-5 text-muted-foreground tabular-nums">
                            {item.ts ? new Date(item.ts).toLocaleTimeString("zh-CN", { hour12: false }) : "-"}
                        </span>
                        <Avatar src={item.uface} name={item.uname} className="h-5 w-5" />
                        <p className="min-w-0 flex-1 break-all leading-5">
                            <span className={cn(
                                "font-semibold",
                                item.guard_level > 0 ? "text-amber-300" : "text-muted-foreground",
                            )}>
                                {item.guard_level > 0 && (
                                    <span className="mr-1 rounded border border-amber-500/30 bg-amber-500/10 px-1 text-[10px]">
                                        {guardNames[item.guard_level]}
                                    </span>
                                )}
                                {item.uname}
                            </span>
                            <span className="text-muted-foreground">：</span>
                            <span className="text-foreground/90">{item.msg}</span>
                        </p>
                    </motion.div>
                ))}
            </AnimatePresence>
            {data.length === 0 && (
                <EmptyState
                    icon={<MessageSquareText className="h-10 w-10" />}
                    title="暂无弹幕"
                    description="等待观众发送弹幕..."
                    className="h-[340px]"
                />
            )}
        </div>
    );
}
