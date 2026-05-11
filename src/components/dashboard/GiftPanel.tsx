
'use client';

import { Avatar } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift } from "@/lib/types";
import { Gift as GiftIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GiftPanelProps {
    data: Gift[];
    className?: string;
}

export function GiftPanel({ data, className }: GiftPanelProps) {
    return (
        <div className={cn("dark-scrollbar h-[420px] w-full overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/55 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.22)]", className)}>
            <div className="space-y-2">
                <AnimatePresence initial={false}>
                    {data.map((item) => (
                        <motion.div
                            key={item.msg_id || item.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.045] p-3"
                        >
                            <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 border border-pink-400/40">
                                    <Avatar.Image src={item.uface ?? undefined} referrerPolicy="no-referrer" />
                                    <Avatar.Fallback>{item.uname?.[0] ?? '?'}</Avatar.Fallback>
                                </Avatar>
                                <div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-semibold text-pink-300">{item.uname}</span>
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
                    <div className="flex h-[340px] flex-col items-center justify-center text-center text-slate-400">
                        <div className="mb-4 rounded-full bg-white/[0.06] p-6 text-slate-500">
                            <GiftIcon className="h-12 w-12" />
                        </div>
                        <div className="text-base font-medium text-slate-300">暂无礼物记录</div>
                        <p className="mt-2 text-sm">快去直播间收获第一份礼物吧!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
