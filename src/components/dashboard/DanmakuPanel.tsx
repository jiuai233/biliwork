
'use client';

import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Danmaku } from "@/lib/types";
import { useEffect, useRef } from "react";

interface DanmakuPanelProps {
    data: Danmaku[];
}

export function DanmakuPanel({ data }: DanmakuPanelProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // 自动滚动到底部
    useEffect(() => {
        if (scrollRef.current) {
            // 只有当用户没有向上滚动太多时才自动滚动
            // 简单处理：总是滚动
            const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [data]);

    return (
        <ScrollArea className="h-[400px] w-full rounded-md border border-zinc-800 bg-zinc-900/50 p-4" ref={scrollRef}>
            <div className="space-y-4">
                <AnimatePresence initial={false}>
                    {data.slice().reverse().map((item) => (
                        <motion.div
                            key={item.msg_id || item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-start space-x-3 text-sm"
                        >
                            <Avatar className="h-8 w-8 border border-zinc-700">
                                <AvatarImage src={item.uface ?? undefined} referrerPolicy="no-referrer" />
                                <AvatarFallback>{(item.uname ?? '').substring(0, 2) || '?'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-zinc-300">{item.uname}</span>
                                    {item.guard_level > 0 && (
                                        <Badge variant="outline" className="border-yellow-600 text-yellow-500 text-[10px] px-1 py-0 h-4">
                                            {item.guard_level === 3 ? '舰长' : item.guard_level === 2 ? '提督' : '总督'}
                                        </Badge>
                                    )}
                                    {item.fans_medal_level > 0 && (
                                        <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-[10px] px-1 py-0 h-4">
                                            {item.fans_medal_name} {item.fans_medal_level}
                                        </Badge>
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
                    <div className="text-center text-zinc-500 py-10">暂无弹幕</div>
                )}
            </div>
        </ScrollArea>
    );
}
