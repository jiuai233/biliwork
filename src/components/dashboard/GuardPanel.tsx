
'use client';

import { Avatar, Chip } from "@heroui/react";
import { motion } from "framer-motion";
import { Guard } from "@/lib/types";
import { Anchor } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuardPanelProps {
    data: Guard[];
    className?: string;
}

export function GuardPanel({ data, className }: GuardPanelProps) {
    const getGuardName = (level: number) => {
        switch (level) {
            case 1: return '总督';
            case 2: return '提督';
            case 3: return '舰长';
            default: return '舰长';
        }
    };

    const getGuardColor = (level: number) => {
        switch (level) {
            case 1: return 'text-red-500 border-red-500/50 bg-red-500/10'; // 总督 - 红色
            case 2: return 'text-purple-500 border-purple-500/50 bg-purple-500/10'; // 提督 - 紫色
            case 3: return 'text-blue-500 border-blue-500/50 bg-blue-500/10'; // 舰长 - 蓝色
            default: return 'text-blue-500';
        }
    };

    return (
        <div className={cn("dark-scrollbar h-[290px] w-full overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/55 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.22)]", className)}>
            <div className="grid grid-cols-1 gap-3">
                {data.map((item) => (
                    <motion.div
                        key={item.msg_id || item.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center gap-3 p-3 rounded-xl border bg-white/[0.045] ${item.guard_level === 1 ? 'border-red-900/50 shadow-[0_0_15px_-3px_rgba(220,38,38,0.3)]' :
                            item.guard_level === 2 ? 'border-purple-900/50' : 'border-blue-900/50'
                            }`}
                    >
                        <Avatar
                            className={`h-12 w-12 border-2 ${item.guard_level === 1 ? 'border-red-500' :
                            item.guard_level === 2 ? 'border-purple-500' : 'border-blue-500'
                            }`}
                        >
                            <Avatar.Image src={item.uface ?? undefined} referrerPolicy="no-referrer" />
                            <Avatar.Fallback>{item.uname?.[0] ?? '?'}</Avatar.Fallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-zinc-100 text-lg">{item.uname}</span>
                                <Chip variant="soft" size="sm" className={getGuardColor(item.guard_level ?? 3)}>
                                    {getGuardName(item.guard_level ?? 3)}
                                </Chip>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-zinc-400">
                                    开通了 <span className="font-bold text-zinc-200">{item.guard_num} {item.guard_unit}</span>
                                </span>
                                <span className="text-zinc-500">{item.ts ? new Date(item.ts).toLocaleDateString() : '-'}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
                {data.length === 0 && (
                    <div className="flex h-[210px] flex-col items-center justify-center text-center text-slate-400">
                        <div className="mb-4 rounded-full bg-white/[0.06] p-6 text-slate-500">
                            <Anchor className="h-12 w-12" />
                        </div>
                        <div className="text-base font-medium text-slate-300">暂无上舰记录</div>
                        <p className="mt-2 text-sm">努力直播，粉丝会上舰支持你的!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
