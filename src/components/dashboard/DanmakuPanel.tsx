'use client';

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Danmaku } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, MessageSquareText } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

interface DanmakuPanelProps {
    data: Danmaku[];
    className?: string;
}

const guardNames: Record<number, string> = { 1: "总督", 2: "提督", 3: "舰长" };

/** 距底部多少像素内视为"在底部"，新数据自动吸底。 */
const NEAR_BOTTOM_PX = 40;

export function DanmakuPanel({ data, className }: DanmakuPanelProps) {
    const reduceMotion = useReducedMotion();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [nearBottom, setNearBottom] = useState(true);
    const [pinned, setPinned] = useState(false);

    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
        setNearBottom(atBottom);
        setPinned(!atBottom);
    };

    const jumpToBottom = () => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
        setNearBottom(true);
        setPinned(false);
    };

    // 用户上翻查看历史时（nearBottom=false）不再被新数据拉回底部。
    useEffect(() => {
        const el = scrollRef.current;
        if (el && nearBottom) {
            el.scrollTop = el.scrollHeight;
        }
    }, [data, nearBottom]);

    return (
        <div
            ref={scrollRef}
            onScroll={handleScroll}
            className={cn("dark-scrollbar relative h-[420px] w-full overflow-y-auto", className)}
        >
            <AnimatePresence initial={false}>
                {data.slice().reverse().map((item) => (
                    <motion.div
                        key={item.msg_id || item.id}
                        initial={reduceMotion ? false : { opacity: 0, x: -10 }}
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

            {pinned && (
                <button
                    type="button"
                    aria-label="回到底部"
                    title="回到底部"
                    onClick={jumpToBottom}
                    className="absolute bottom-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-lg transition-colors hover:bg-accent hover:text-foreground"
                >
                    <ArrowDownToLine className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
