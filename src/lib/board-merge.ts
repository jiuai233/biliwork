import type { Transaction } from "@/lib/data";
import { parseCountContent } from "@/lib/format";

export type BoardTransaction = Transaction & {
    mergedIds?: string[];
};

function getBoardMergeKey(transaction: Transaction): string | null {
    if (transaction.type === "super_chat") return null;

    const parsed = parseCountContent(transaction.content);
    const userKey = transaction.uname.trim().toLowerCase();
    const itemKey = parsed.name.trim().toLowerCase();

    return [transaction.type, userKey, itemKey, transaction.guardLevel ?? ""].join("|");
}

function mergeBoardTransaction(existing: BoardTransaction, incoming: Transaction): BoardTransaction {
    const existingContent = parseCountContent(existing.content);
    const incomingContent = parseCountContent(incoming.content);
    const nextCount = existingContent.count + incomingContent.count;
    const suffix = existingContent.suffix || incomingContent.suffix;

    return {
        ...existing,
        content: `${existingContent.name} x${nextCount}${suffix}`,
        price: Number((existing.price + incoming.price).toFixed(2)),
        ts: Math.max(existing.ts, incoming.ts),
        mergedIds: Array.from(new Set([...(existing.mergedIds ?? [existing.id]), incoming.id])),
    };
}

export function isSourceConsumed(boardItems: BoardTransaction[], item: Transaction): boolean {
    return boardItems.some((boardItem) => boardItem.id === item.id || boardItem.mergedIds?.includes(item.id));
}

export function mergeTransactionsIntoBoard(
    currentItems: BoardTransaction[],
    incomingItems: Transaction[],
): BoardTransaction[] {
    const nextItems = [...currentItems];

    for (const item of incomingItems) {
        if (isSourceConsumed(nextItems, item)) continue;

        const mergeKey = getBoardMergeKey(item);
        const existingIndex = mergeKey
            ? nextItems.findIndex((boardItem) => getBoardMergeKey(boardItem) === mergeKey)
            : -1;

        if (existingIndex >= 0) {
            nextItems[existingIndex] = mergeBoardTransaction(nextItems[existingIndex], item);
        } else {
            nextItems.push({ ...item, mergedIds: [item.id] });
        }
    }

    return nextItems;
}
