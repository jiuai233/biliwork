
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { SuperChat } from "@/lib/types";

interface SCPanelProps {
    data: SuperChat[];
}

export function SCPanel({ data }: SCPanelProps) {
    return (
        <ScrollArea className="h-[400px] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                {data.map((item) => (
                    <motion.div
                        key={item.msg_id || item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card className="border-0 bg-gradient-to-br from-red-500/10 to-orange-500/10 border-l-4 border-l-red-500 overflow-hidden">
                            <CardHeader className="p-3 pb-2 flex flex-row items-center gap-3 space-y-0">
                                <Avatar className="h-10 w-10 border-2 border-red-500">
                                    <AvatarImage src={item.uface ?? undefined} referrerPolicy="no-referrer" />
                                    <AvatarFallback>{item.uname?.[0] ?? '?'}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-red-400 truncate">{item.uname}</span>
                                        <span className="font-black text-xl text-red-500">¥{item.rmb}</span>
                                    </div>
                                    <div className="text-xs text-zinc-500 truncate">
                                        {item.ts ? new Date(item.ts).toLocaleString() : '-'}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                                <div className="mt-2 bg-zinc-900/60 p-2 rounded text-zinc-200 text-sm font-medium leading-relaxed break-all">
                                    {item.message}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
                {data.length === 0 && (
                    <div className="col-span-full h-32 flex items-center justify-center border border-dashed border-zinc-800 rounded-lg text-zinc-500">
                        暂无醒目留言
                    </div>
                )}
            </div>
        </ScrollArea>
    );
}
