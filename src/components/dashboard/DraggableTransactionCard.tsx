
"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Avatar } from "@/components/ui/avatar";
import { Transaction } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface DraggableTransactionCardProps {
    transaction: Transaction;
    isOverlay?: boolean;
    onAdd?: (transaction: Transaction) => void;
}

export function DraggableTransactionCard({
    transaction,
    isOverlay = false,
    onAdd,
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
                return "border-border bg-card";
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cn(
                "relative flex min-w-0 cursor-grab items-center gap-2.5 rounded-lg border p-2 transition-colors active:cursor-grabbing",
                getCardStyle(transaction.type),
                isOverlay && "z-50 scale-105 cursor-grabbing bg-card shadow-2xl",
            )}
        >
            <Avatar src={transaction.uface} name={transaction.uname} className="h-8 w-8 shrink-0" />
            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center justify-between">
                    <span className="truncate pr-2 text-sm font-bold text-foreground">{transaction.uname}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">¥{transaction.price}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                    {transaction.icon && (
                        <img src={transaction.icon} alt="" className="h-4 w-4 shrink-0 object-contain" referrerPolicy="no-referrer" />
                    )}
                    <span className="truncate">{transaction.content}</span>
                </div>
            </div>
            {onAdd && (
                <button
                    type="button"
                    aria-label={`添加 ${transaction.uname} 的记录`}
                    title="加入组合看板"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => onAdd(transaction)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background/70 text-muted-foreground transition hover:border-primary/40 hover:bg-primary/15 hover:text-primary"
                >
                    <Plus className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
