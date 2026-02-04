
'use client';

import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { Gift } from "@/lib/types";

interface GiftPanelProps {
    data: Gift[];
}

export function GiftPanel({ data }: GiftPanelProps) {
    return (
        <ScrollArea className="h-[400px] w-full rounded-md border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="space-y-2">
                <AnimatePresence initial={false}>
                    {data.map((item) => (
                        <motion.div
                            key={item.msg_id || item.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/40 border border-zinc-800/60"
                        >
                            <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 border border-pink-500/30">
                                    <AvatarImage src={item.uface ?? undefined} referrerPolicy="no-referrer" />
                                    <AvatarFallback>{item.uname?.[0] ?? '?'}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-medium text-pink-400">{item.uname}</span>
                                        <span className="text-xs text-zinc-500">送出</span>
                                    </div>
                                    <div className="font-bold text-zinc-100 flex items-center gap-1">
                                        {item.gift_name} <span className="text-pink-500">x{item.gift_num}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-zinc-300">
                                    ¥{(item.r_price * item.gift_num / 1000).toFixed(1)}
                                </div>
                                <div className="text-[10px] text-zinc-600">
                                    {item.ts ? new Date(item.ts).toLocaleTimeString() : '-'}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {data.length === 0 && (
                    <div className="text-center text-zinc-500 py-10">暂无礼物记录</div>
                )}
            </div>
        </ScrollArea>
    );
}
