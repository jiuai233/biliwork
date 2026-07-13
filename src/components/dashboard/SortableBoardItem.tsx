"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TransactionCard, BILI_CARD_WIDTH } from "@/components/bilibili/TransactionCard";
import type { BoardTransaction } from "@/lib/board-merge";

export function SortableBoardItem({
    transaction,
    onRemove,
}: {
    transaction: BoardTransaction;
    onRemove: (id: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: transaction.id,
    });

    return (
        <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.5 : 1,
                position: "relative",
                width: `${BILI_CARD_WIDTH}px`,
                flexShrink: 0,
                transformOrigin: "right center",
            }}
        >
            <TransactionCard
                transaction={transaction}
                size="board"
                onRemove={onRemove}
                data-board-card
            />
        </div>
    );
}
