
'use client';

import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Guard } from "@/lib/types";

interface GuardPanelProps {
    data: Guard[];
}

export function GuardPanel({ data }: GuardPanelProps) {
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
        <ScrollArea className="h-[400px] w-full rounded-md border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="grid grid-cols-1 gap-3">
                {data.map((item) => (
                    <motion.div
                        key={item.msg_id || item.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center gap-3 p-3 rounded-xl border bg-zinc-900/80 ${item.guard_level === 1 ? 'border-red-900/50 shadow-[0_0_15px_-3px_rgba(220,38,38,0.3)]' :
                            item.guard_level === 2 ? 'border-purple-900/50' : 'border-blue-900/50'
                            }`}
                    >
                        <Avatar className={`h-12 w-12 border-2 ${item.guard_level === 1 ? 'border-red-500' :
                            item.guard_level === 2 ? 'border-purple-500' : 'border-blue-500'
                            }`}>
                            <AvatarImage src={item.uface ?? undefined} referrerPolicy="no-referrer" />
                            <AvatarFallback>{item.uname?.[0] ?? '?'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-zinc-100 text-lg">{item.uname}</span>
                                <Badge variant="outline" className={`${getGuardColor(item.guard_level ?? 3)}`}>
                                    {getGuardName(item.guard_level ?? 3)}
                                </Badge>
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
                    <div className="text-center text-zinc-500 py-10">暂无上舰记录</div>
                )}
            </div>
        </ScrollArea>
    );
}
