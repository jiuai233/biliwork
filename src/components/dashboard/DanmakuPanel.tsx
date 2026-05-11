
'use client';

import { Avatar, Chip } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import { Danmaku } from "@/lib/types";
import { useEffect, useRef } from "react";
import { MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";

interface DanmakuPanelProps {
    data: Danmaku[];
    className?: string;
}

export function DanmakuPanel({ data, className }: DanmakuPanelProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // 自动滚动到底部
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [data]);

    return (
        <div className={cn("dark-scrollbar h-[420px] w-full overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/55 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.22)]", className)} ref={scrollRef}>
            <div className="space-y-4">
                <AnimatePresence initial={false}>
                    {data.slice().reverse().map((item) => (
                        <motion.div
                            key={item.msg_id || item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-start gap-3 text-sm"
                        >
                            <Avatar className="h-8 w-8 border border-white/10">
                                <Avatar.Image src={item.uface ?? undefined} referrerPolicy="no-referrer" />
                                <Avatar.Fallback>{(item.uname ?? '').substring(0, 2) || '?'}</Avatar.Fallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-zinc-300">{item.uname}</span>
                                    {item.guard_level > 0 && (
                                        <Chip variant="soft" size="sm" className="h-4 border-yellow-600 bg-yellow-500/10 px-1 text-[10px] text-yellow-500">
                                            {item.guard_level === 3 ? '舰长' : item.guard_level === 2 ? '提督' : '总督'}
                                        </Chip>
                                    )}
                                    {item.fans_medal_level > 0 && (
                                        <Chip variant="soft" size="sm" className="h-4 bg-zinc-800 px-1 text-[10px] text-zinc-400">
                                            {item.fans_medal_name} {item.fans_medal_level}
                                        </Chip>
                                    )}
                                </div>
                                <p className="text-zinc-100 break-all leading-relaxed">{item.msg}</p>
                            </div>
                            <span className="text-[10px] text-zinc-600 whitespace-nowrap">
                                {item.ts ? new Date(item.ts).toLocaleTimeString() : '-'}
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {data.length === 0 && (
                    <div className="flex h-[340px] flex-col items-center justify-center text-center text-slate-400">
                        <div className="mb-4 rounded-full bg-white/[0.06] p-6 text-slate-500">
                            <MessageSquareText className="h-12 w-12" />
                        </div>
                        <div className="text-base font-medium text-slate-300">暂无弹幕</div>
                        <p className="mt-2 text-sm">等待观众发送弹幕...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
