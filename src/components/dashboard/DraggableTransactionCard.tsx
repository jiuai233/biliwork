
"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Transaction } from "@/lib/data";
import { cn } from "@/lib/utils";

interface DraggableTransactionCardProps {
    transaction: Transaction;
    isOverlay?: boolean;
}

export function DraggableTransactionCard({
    transaction,
    isOverlay = false,
}: DraggableTransactionCardProps) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: transaction.id,
        data: transaction,
    });

    const style = {
        transform: CSS.Translate.toString(transform),
    };

    const getCardStyle = (type: string) => {
        switch (type) {
            case "gift":
                return "border-pink-500/30 bg-pink-500/5 hover:bg-pink-500/10";
            case "guard":
                return "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10";
            case "super_chat":
                return "border-red-500/30 bg-red-500/5 hover:bg-red-500/10";
            default:
                return "border-zinc-800 bg-zinc-900";
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cn(
                "relative flex items-center gap-3 p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-colors",
                getCardStyle(transaction.type),
                isOverlay ? "shadow-2xl scale-105 z-50 cursor-grabbing bg-zinc-900" : ""
            )}
        >
            <Avatar className="h-8 w-8 border border-white/10 shrink-0">
                <AvatarImage src={transaction.uface ?? undefined} referrerPolicy="no-referrer" />
                <AvatarFallback>{transaction.uname?.[0] ?? '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-zinc-200 truncate pr-2">
                        {transaction.uname}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">
                        ¥{transaction.price}
                    </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-zinc-500 truncate mt-0.5">
                    {transaction.icon && <img src={transaction.icon} alt="icon" className="w-4 h-4 object-contain shrink-0" referrerPolicy="no-referrer" />}
                    <span className="truncate">{transaction.content}</span>
                </div>
            </div>
        </div>
    );
}
