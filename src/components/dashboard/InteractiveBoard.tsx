
"use client";

import React, { useState, useTransition } from "react";
import {
    DndContext,
    DragOverlay,
    useDroppable,
    DragStartEvent,
    DragEndEvent,
    closestCenter,
    useSensor,
    useSensors,
    PointerSensor,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Transaction } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DraggableTransactionCard } from "./DraggableTransactionCard";
import { Clock, Download, Loader2, Monitor, Radio, RefreshCw, Search, X } from "lucide-react";
import { domToPng } from "modern-screenshot";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getBoardTransactionsForSession, getRecentBoardTransactions } from "@/app/dashboard/board/actions";

type BoardTransaction = Transaction & {
    mergedIds?: string[];
};

type BoardSession = {
    id: number;
    startTs: number;
    endTs: number | null;
    duration: number;
    title: string | null;
    areaName: string | null;
    totalIncome: number;
};

const BOARD_CARD_WIDTH = 500;
const BOARD_GIFT_CARD_HEIGHT = 80;

type ParsedCountContent = {
    name: string;
    count: number;
    suffix: string;
};

function parseCountContent(content: string): ParsedCountContent {
    const match = content.match(/^(.*?) x(\d+)(.*)$/);
    return {
        name: match ? match[1].trim() : content.trim(),
        count: match ? Number(match[2]) : 1,
        suffix: match ? match[3] : "",
    };
}

function getBoardMergeKey(transaction: Transaction): string | null {
    if (transaction.type === "super_chat") return null;

    const parsed = parseCountContent(transaction.content);
    const userKey = transaction.uname.trim().toLowerCase();
    const itemKey = parsed.name.trim().toLowerCase();

    return [
        transaction.type,
        userKey,
        itemKey,
        transaction.guardLevel ?? "",
    ].join("|");
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

function isSourceConsumed(boardItems: BoardTransaction[], item: Transaction): boolean {
    return boardItems.some((boardItem) => boardItem.id === item.id || boardItem.mergedIds?.includes(item.id));
}

function mergeTransactionsIntoBoard(
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

// --- Helper for Price Colors (Gift Only) ---
const getPriceStyle = (price: number): React.CSSProperties => {
    if (price < 10) return { background: "linear-gradient(90deg, #3f3f46 0%, #18181b 100%)", borderLeft: "6px solid #a1a1aa" };
    if (price < 30) return { background: "linear-gradient(90deg, #60a5fa 0%, #2563eb 100%)", borderLeft: "6px solid #dbeafe" };
    if (price < 100) return { background: "linear-gradient(90deg, #818cf8 0%, #4f46e5 100%)", borderLeft: "6px solid #e0e7ff" };
    if (price < 500) return { background: "linear-gradient(90deg, #f472b6 0%, #db2777 100%)", borderLeft: "6px solid #fce7f3" };
    return { background: "linear-gradient(90deg, #fbbf24 0%, #d97706 100%)", borderLeft: "6px solid #fef3c7" };
};

// --- SC Color Configuration (Reference Matching) ---
// Returns { headerBg, bodyBg } based on price
const getSCColors = (price: number) => {
    // Tier 1: Cyan (¥30 - < ¥50) - Ref Image 0
    if (price < 50) return {
        headerBg: "#e0f7fa", // Light Cyan
        bodyBg: "#00bad0",   // Vibrant Cyan (Bilibili Style)
        headerText: "#006064"
    };
    // Tier 2: Blue (¥50 - < ¥100) - Ref Image 1 (Deep Blue)
    if (price < 100) return {
        headerBg: "#e3f2fd", // Light Blue
        bodyBg: "#4878a6",   // Muted Blue/Slate
        headerText: "#0d47a1"
    };
    // Tier 3: Yellow (¥100 - < ¥1000) - Ref Image 2 (Yellow/Gold)
    if (price < 1000) return {
        headerBg: "#fff9c4", // Light Yellow
        bodyBg: "#e6ac00",   // Goldenrod/Orange-Yellow
        headerText: "#f57f17"
    };
    // Tier 4: Red (¥1000+) - Ref Image 4 (Red)
    return {
        headerBg: "#ffebee", // Light Red
        bodyBg: "#d32f2f",   // Deep Red
        headerText: "#b71c1c"
    };
};

// --- Helper for Guard Assets ---
const getGuardAssets = (guardLevel?: number) => {
    switch (guardLevel) {
        case 1: return { icon: "/zongdu.png", border: "/zongduborder.png", gradient: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)" };
        case 2: return { icon: "/tidu.png", border: "/tiduborder.png", gradient: "linear-gradient(90deg, #c084fc 0%, #9333ea 50%, #7e22ce 100%)" };
        case 3:
        default: return { icon: "/jianzhang.png", border: "/jianzhangboder.png", gradient: "linear-gradient(90deg, #60a5fa 0%, #2563eb 50%, #1d4ed8 100%)" };
    }
};

// --- Gold Coin Icon Component ---
const GoldCoinIcon = ({ size = 24 }: { size?: number }) => (
    <div style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
        border: "1px solid #fef08a",
        boxShadow: "inset 0 1px 2px rgba(255,255,255,0.4), 0 1px 2px rgba(0,0,0,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#78350f",
        fontWeight: "bold",
        fontSize: size * 0.65,
        fontFamily: "Arial, sans-serif",
        flexShrink: 0,
    }}>
        ¥
    </div>
);

// --- Sortable Item Wrapper ---
function SortableBoardItem({
    transaction,
    onRemove,
}: {
    transaction: BoardTransaction;
    onRemove: (id: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: transaction.id });

    // Parse Content
    const parsedContent = parseCountContent(transaction.content);
    const giftName = parsedContent.name;
    const giftNum = parsedContent.count > 1 || transaction.content.includes(" x")
        ? String(parsedContent.count)
        : "";

    const isGuard = transaction.type === 'guard';
    const isSC = transaction.type === 'super_chat';
    const guardAssets = isGuard ? getGuardAssets(transaction.guardLevel) : null;

    // Get SC Colors
    const scColors = isSC ? getSCColors(transaction.price) : null;

    // Base container style - 500px width (Fixed length per user request)
    const containerStyle: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: "relative",
        width: `${BOARD_CARD_WIDTH}px`,
        flexShrink: 0,
        transformOrigin: "right center",
    };

    // --- SC Card Layout ---
    if (isSC && scColors) {
        return (
            <div
                ref={setNodeRef}
                data-board-card
                style={{
                    ...containerStyle,
                    borderRadius: "16px",
                    overflow: "hidden",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    fontFamily: '"Microsoft YaHei", sans-serif',
                }}
                {...attributes}
                {...listeners}
                className="group"
            >
                {/* Delete Button */}
                <button
                    onClick={() => onRemove(transaction.id)}
                    style={{
                        position: "absolute", top: "6px", right: "6px",
                        background: "#ef4444", border: "2px solid #fff", borderRadius: "50%",
                        width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", zIndex: 50,
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    data-html2canvas-ignore="true"
                >
                    <X style={{ width: "12px", height: "12px", color: "white" }} />
                </button>

                {/* SC Header Bar */}
                <div style={{
                    backgroundColor: scColors.headerBg,
                    padding: "10px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTopLeftRadius: "16px",
                    borderTopRightRadius: "16px",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {/* Avatar */}
                        <div style={{
                            width: "42px", height: "42px", borderRadius: "50%",
                            border: "2px solid rgba(255,255,255,0.8)", overflow: "hidden",
                            flexShrink: 0,
                        }}>
                            {transaction.uface ? (
                                <img src={transaction.uface} alt={transaction.uname}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div style={{ width: "100%", height: "100%", background: "#3f3f46", display: "flex", alignItems: "center", justifyContent: "center", color: "#a1a1aa", fontSize: "16px", fontWeight: "bold" }}>
                                    {transaction.uname?.[0] || '?'}
                                </div>
                            )}
                        </div>
                        {/* Username */}
                        <div style={{
                            fontSize: "16px",
                            color: scColors.headerText,
                            fontWeight: "bold", // Bolder name per visual
                        }}>
                            {transaction.uname}
                        </div>
                    </div>

                    {/* Price with Coin Icon */}
                    <div style={{
                        display: "flex", alignItems: "center", gap: "4px",
                        color: scColors.headerText,
                        fontWeight: "normal",
                        fontSize: "18px",
                    }}>
                        <span>{transaction.price}</span>
                        <GoldCoinIcon size={20} />
                    </div>
                </div>

                {/* SC Message Body */}
                <div style={{
                    backgroundColor: scColors.bodyBg,
                    padding: "14px 16px",
                    color: "#ffffff",
                    fontSize: "16px",
                    lineHeight: 1.5,
                    borderBottomLeftRadius: "16px",
                    borderBottomRightRadius: "16px",
                    fontWeight: 400,
                }}>
                    {transaction.content}
                </div>
            </div>
        );
    }

    // --- Gift & Guard Layout ---
    const getBarStyle = (): React.CSSProperties => {
        const base: React.CSSProperties = {
            position: "absolute",
            left: "20px", right: 0, top: 0, bottom: 0,
            borderRadius: "8px",
            transform: "skewX(-12deg)",
            boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
            zIndex: 0,
        };
        if (isGuard && guardAssets) {
            return { ...base, background: guardAssets.gradient, borderLeft: "6px solid #fff" };
        }
        return { ...base, ...getPriceStyle(transaction.price) };
    };

    const avatarBorderStyle: React.CSSProperties = isGuard && guardAssets ? {
        position: "absolute", top: "-8px", left: "-8px",
        width: "calc(100% + 16px)", height: "calc(100% + 16px)",
        backgroundImage: `url(${guardAssets.border})`,
        backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center",
        zIndex: 20, pointerEvents: "none",
    } : {};

    return (
        <div
            ref={setNodeRef}
            data-board-card
            style={{ ...containerStyle, display: "flex", alignItems: "center", height: `${BOARD_GIFT_CARD_HEIGHT}px` }}
            {...attributes}
            {...listeners}
            className="group"
        >
            {/* Delete Button */}
            <button
                onClick={() => onRemove(transaction.id)}
                style={{
                    position: "absolute", top: "-8px", right: "-4px",
                    background: "#ef4444", border: "2px solid #fff", borderRadius: "50%",
                    width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", zIndex: 50,
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                data-html2canvas-ignore="true"
            >
                <X style={{ width: "12px", height: "12px", color: "white" }} />
            </button>

            {/* Background Layer */}
            <div style={getBarStyle()} />

            {/* Content Layer */}
            <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", width: "100%", paddingRight: "16px" }}>

                {/* Avatar */}
                <div style={{ marginRight: "12px", flexShrink: 0, position: "relative" }}>
                    <div style={{
                        width: "64px", height: "64px", borderRadius: "50%",
                        border: isGuard ? "none" : "3px solid white",
                        overflow: "hidden", backgroundColor: "#fff",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.2)", position: "relative",
                    }}>
                        {transaction.uface ? (
                            <img src={transaction.uface} alt={transaction.uname}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div style={{ width: "100%", height: "100%", background: "#3f3f46", display: "flex", alignItems: "center", justifyContent: "center", color: "#a1a1aa", fontSize: "20px", fontWeight: "bold" }}>
                                {transaction.uname?.[0] || '?'}
                            </div>
                        )}
                    </div>
                    {isGuard && guardAssets && <div style={avatarBorderStyle} />}
                </div>

                {/* User Info */}
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{
                        fontSize: "18px", fontWeight: "bold", color: "#ffffff",
                        textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                        {transaction.uname}
                    </div>
                    <div style={{
                        fontSize: "14px", color: "rgba(255,255,255,0.9)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                        {isGuard ? (
                            <span style={{ color: "#fde047", fontWeight: "bold" }}>上舰 {giftName}</span>
                        ) : (
                            <>
                                <span style={{ marginRight: "4px" }}>投喂</span>
                                <span style={{ color: "#fde047", fontWeight: "bold" }}>{giftName}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Right: Icon & Count & Price */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "8px" }}>
                    {isGuard && guardAssets && (
                        <img src={guardAssets.icon} alt="guard"
                            style={{ width: "48px", height: "48px", objectFit: "contain", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }}
                        />
                    )}
                    {transaction.icon && !isGuard && (
                        <img src={transaction.icon} alt="gift"
                            style={{ width: "52px", height: "52px", objectFit: "contain", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }}
                            referrerPolicy="no-referrer"
                        />
                    )}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center" }}>
                        {giftNum && (
                            <div style={{
                                fontFamily: "Arial, Impact, sans-serif", fontWeight: 900, fontStyle: "italic",
                                fontSize: "28px", color: "#fde047",
                                textShadow: "2px 2px 0px rgba(0,0,0,0.4)",
                                lineHeight: 1,
                                marginBottom: "2px",
                            }}>
                                <span style={{ fontSize: "20px", marginRight: "2px" }}>x</span>{giftNum}
                            </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ fontSize: "20px", fontWeight: "bold", color: "white", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>{transaction.price}</span>
                            <GoldCoinIcon size={20} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Droppable Board Area ---
function BoardArea({ items, onRemove }: { items: BoardTransaction[], onRemove: (id: string) => void }) {
    const { setNodeRef } = useDroppable({
        id: "board-droppable",
    });

    return (
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div
                ref={setNodeRef}
                id="board-canvas"
                style={{
                    // No background color for transparent export
                    padding: "16px",
                    width: "100%",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column", // Vertical stack
                    alignItems: "flex-end",   // Right align items
                    gap: "16px",
                    minHeight: "100%",
                }}
                className=""
            >
                {items.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 space-y-4 min-h-[400px] w-full">
                        <div className="p-4 rounded-full bg-zinc-900/50 border border-zinc-800/50">
                            <Download className="w-8 h-8 opacity-30" />
                        </div>
                        <p className="text-sm opacity-50">等待投喂...</p>
                    </div>
                )}
                {items.map((item) => (
                    <SortableBoardItem key={item.id} transaction={item} onRemove={onRemove} />
                ))}
            </div>
        </SortableContext>
    );
}

// --- Main Component ---
interface InteractiveBoardProps {
    initialTransactions: Transaction[];
    initialSessions?: BoardSession[];
    overlayCode?: string;
}

function formatSessionTime(ts: number) {
    return new Date(ts).toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatSessionDuration(minutes: number, isLive: boolean) {
    if (isLive) return "直播中";
    if (minutes <= 0) return "未知时长";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export function InteractiveBoard({ initialTransactions, initialSessions = [], overlayCode }: InteractiveBoardProps) {
    const [sourceItems, setSourceItems] = useState<Transaction[]>(initialTransactions);
    const [boardItems, setBoardItems] = useState<BoardTransaction[]>([]);
    const [activeDragItem, setActiveDragItem] = useState<Transaction | null>(null);
    const [selectedSessionId, setSelectedSessionId] = useState<string>("recent");
    const [isSessionPending, startSessionTransition] = useTransition();
    const sessionRequestRef = React.useRef(0);

    // Filters
    const [searchName, setSearchName] = useState("");
    const [minPrice, setMinPrice] = useState("");
    const [filterType, setFilterType] = useState<'all' | 'super_chat' | 'gift' | 'guard'>('all');
    const [isMounted, setIsMounted] = useState(false);
    const [scrollSpeed, setScrollSpeed] = useState(5);
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const currentSession = initialSessions.find((session) => !session.endTs);
    const historySessions = initialSessions.filter((session) => session.endTs);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    // 挂载时从 overlay config 恢复滚动设置
    React.useEffect(() => {
        if (!overlayCode || !isMounted) return;
        fetch(`/api/overlay/${overlayCode}/config`)
            .then((res) => res.json())
            .then((config) => {
                if (typeof config.scrollSpeed === "number") {
                    setScrollSpeed(config.scrollSpeed);
                }
                if (typeof config.scrollEnabled === "boolean") {
                    setScrollEnabled(config.scrollEnabled);
                }
            })
            .catch(() => { });
    }, [overlayCode, isMounted]);

    // 挂载时从 overlay store 恢复 board 状态
    React.useEffect(() => {
        if (!overlayCode || !isMounted) return;
        fetch(`/api/overlay/${overlayCode}/poll`)
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data) && data.length > 0) {
                    setBoardItems(data);
                }
            })
            .catch(() => { });
    }, [overlayCode, isMounted]);

    // 自动同步 board 状态到 OBS 叠加层
    React.useEffect(() => {
        if (!overlayCode || !isMounted) return;

        const timer = setTimeout(() => {
            fetch(`/api/overlay/${overlayCode}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(boardItems),
            }).catch(() => { });
        }, 500); // 500ms 防抖

        return () => clearTimeout(timer);
    }, [boardItems, overlayCode, isMounted]);

    // 同步滚动设置到 OBS config
    React.useEffect(() => {
        if (!overlayCode || !isMounted) return;

        const timer = setTimeout(() => {
            fetch(`/api/overlay/${overlayCode}/config`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scrollSpeed, scrollEnabled }),
            }).catch(() => { });
        }, 500);

        return () => clearTimeout(timer);
    }, [scrollSpeed, scrollEnabled, overlayCode, isMounted]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const filteredSource = sourceItems.filter((item) => {
        const matchType = filterType === 'all' || item.type === filterType;
        const matchName =
            !searchName || item.uname.toLowerCase().includes(searchName.toLowerCase()) || item.content.toLowerCase().includes(searchName.toLowerCase());
        const matchPrice = !minPrice || item.price >= Number(minPrice);
        // Filter out raw records that were already added or merged into a board item.
        const notOnBoard = !isSourceConsumed(boardItems, item);
        return matchType && matchName && matchPrice && notOnBoard;
    });

    const handleSelectRecent = () => {
        sessionRequestRef.current += 1;
        setSelectedSessionId("recent");
        setSourceItems(initialTransactions);
    };

    const handleSelectSession = (session: BoardSession) => {
        const sessionKey = String(session.id);
        const requestId = sessionRequestRef.current + 1;
        sessionRequestRef.current = requestId;
        setSelectedSessionId(sessionKey);
        startSessionTransition(async () => {
            try {
                const nextTransactions = await getBoardTransactionsForSession(session.startTs, session.endTs);
                if (sessionRequestRef.current !== requestId) return;
                setSourceItems(nextTransactions);
            } catch (error) {
                if (sessionRequestRef.current !== requestId) return;
                console.error(error);
                toast.error("加载场次记录失败");
            }
        });
    };

    const handleSelectCurrentSession = () => {
        if (!currentSession) {
            toast.error("未检测到当前开播场次");
            return;
        }

        const requestId = sessionRequestRef.current + 1;
        sessionRequestRef.current = requestId;
        setSelectedSessionId("current");
        startSessionTransition(async () => {
            try {
                const nextTransactions = await getBoardTransactionsForSession(currentSession.startTs, null);
                if (sessionRequestRef.current !== requestId) return;
                setSourceItems(nextTransactions);
            } catch (error) {
                if (sessionRequestRef.current !== requestId) return;
                console.error(error);
                toast.error("加载当前场次失败");
            }
        });
    };

    const handleRefreshSource = () => {
        const requestId = sessionRequestRef.current + 1;
        sessionRequestRef.current = requestId;

        startSessionTransition(async () => {
            try {
                let nextTransactions: Transaction[];

                if (selectedSessionId === "recent") {
                    nextTransactions = await getRecentBoardTransactions();
                } else if (selectedSessionId === "current") {
                    if (!currentSession) {
                        toast.error("未检测到当前开播场次");
                        return;
                    }
                    nextTransactions = await getBoardTransactionsForSession(currentSession.startTs, null);
                } else {
                    const session = initialSessions.find((item) => String(item.id) === selectedSessionId);
                    if (!session) {
                        toast.error("找不到已选择的场次");
                        return;
                    }
                    nextTransactions = await getBoardTransactionsForSession(session.startTs, session.endTs);
                }

                if (sessionRequestRef.current !== requestId) return;
                setSourceItems(nextTransactions);
                toast.success("记录已刷新");
            } catch (error) {
                if (sessionRequestRef.current !== requestId) return;
                console.error(error);
                toast.error("刷新记录失败");
            }
        });
    };

    if (!isMounted) {
        return <div className="h-[calc(100vh-200px)] flex items-center justify-center text-zinc-500">Loading Board...</div>;
    }

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const item =
            sourceItems.find((i) => i.id === active.id) ||
            boardItems.find((i) => i.id === active.id);
        if (item) setActiveDragItem(item);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragItem(null);

        if (!over) return;

        // Case 1: Dragging from Source to Board
        if (!boardItems.find(i => i.id === active.id)) {
            if (over.id === 'board-droppable' || boardItems.find(i => i.id === over.id)) {
                const item = sourceItems.find(i => i.id === active.id);
                if (item) {
                    setBoardItems((items) => mergeTransactionsIntoBoard(items, [item]));
                }
            }
        }
        // Case 2: Reordering on Board
        else if (active.id !== over.id) {
            setBoardItems((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleRemoveFromBoard = (id: string) => {
        setBoardItems(items => items.filter(i => i.id !== id));
    };

    const handleImportAllVisible = () => {
        if (filteredSource.length === 0) {
            toast.info("当前没有可导入记录");
            return;
        }

        const importCount = filteredSource.length;
        setBoardItems((items) => mergeTransactionsIntoBoard(items, filteredSource));
        toast.success(`已导入 ${importCount} 条可用记录`);
    };

    const handleExport = async () => {
        const element = document.getElementById("board-canvas");
        if (!element) return;

        const origMinHeight = element.style.minHeight;
        const origWidth = element.style.width;
        const origPadding = element.style.padding;

        try {
            toast.info("正在生成图片...");

            // Read the actual card width from the first card, fallback to the board card width.
            const firstCard = element.querySelector<HTMLElement>("[data-board-card]");
            const cardWidth = firstCard ? `${firstCard.offsetWidth}px` : `${BOARD_CARD_WIDTH}px`;

            // Temporarily shrink container to card width for clean export.
            element.style.minHeight = "0";
            element.style.width = cardWidth;
            element.style.padding = "0";

            const dataUrl = await domToPng(element, {
                scale: 2,
                backgroundColor: null,
                filter: (el) => {
                    if (el instanceof HTMLElement && el.hasAttribute("data-html2canvas-ignore")) {
                        return false;
                    }
                    return true;
                },
                fetch: {
                    requestInit: {
                        referrerPolicy: "no-referrer",
                        mode: "cors",
                    },
                },
            });

            const link = document.createElement("a");
            link.download = `bili-monitor-board-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
            toast.success("图片导出成功！");
        } catch (err) {
            console.error(err);
            toast.error("导出失败，请重试");
        } finally {
            element.style.minHeight = origMinHeight;
            element.style.width = origWidth;
            element.style.padding = origPadding;
        }
    };

    return (
        <DndContext
            id="interactive-board-dnd"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex min-w-0 flex-col gap-4 lg:h-[calc(100vh-220px)] lg:flex-row lg:gap-6">
                {/* Sidebar: Source List */}
                <div className="flex w-full min-w-0 flex-col gap-4 lg:w-80 lg:shrink-0">
                    <div className="min-w-0 space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                        <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
                            <Search className="w-4 h-4" /> 筛选记录
                        </h3>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                                    <Radio className="h-4 w-4 text-purple-300" />
                                    直播场次
                                </label>
                                {isSessionPending && (
                                    <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        加载中
                                    </span>
                                )}
                            </div>
                            <div className="dark-scrollbar max-h-44 space-y-2 overflow-y-auto pr-1">
                                <button
                                    type="button"
                                    onClick={handleSelectRecent}
                                    className={cn(
                                        "w-full rounded-lg border px-3 py-2 text-left transition",
                                        selectedSessionId === "recent"
                                            ? "border-purple-500/50 bg-purple-500/15 text-white"
                                            : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900"
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-semibold">最近记录</span>
                                        <span className="text-xs text-zinc-500">{initialTransactions.length} 条</span>
                                    </div>
                                    <div className="mt-1 text-xs text-zinc-500">不限制场次，显示最近交易</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSelectCurrentSession}
                                    disabled={!currentSession}
                                    className={cn(
                                        "w-full rounded-lg border px-3 py-2 text-left transition",
                                        selectedSessionId === "current"
                                            ? "border-emerald-500/60 bg-emerald-500/15 text-white"
                                            : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900",
                                        !currentSession && "cursor-not-allowed opacity-55 hover:border-zinc-800 hover:bg-zinc-950/60"
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-semibold text-zinc-100">当前场次</span>
                                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                                            {currentSession ? "直播中" : "未检测"}
                                        </span>
                                    </div>
                                    <div className="mt-1 text-xs text-zinc-500">
                                        {currentSession
                                            ? `从 ${formatSessionTime(currentSession.startTs)} 到现在`
                                            : "需要采集到开播事件后可用"}
                                    </div>
                                </button>
                                {historySessions.map((session) => {
                                    const isLive = false;
                                    const selected = selectedSessionId === String(session.id);

                                    return (
                                        <button
                                            key={session.id}
                                            type="button"
                                            onClick={() => handleSelectSession(session)}
                                            className={cn(
                                                "w-full rounded-lg border px-3 py-2 text-left transition",
                                                selected
                                                    ? "border-blue-500/60 bg-blue-500/15 text-white"
                                                    : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900"
                                            )}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="min-w-0 truncate text-sm font-semibold text-zinc-100">
                                                    {session.title || "直播场次"}
                                                </span>
                                                <span className={cn(
                                                    "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                                                    isLive ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-800 text-zinc-400"
                                                )}>
                                                    {formatSessionDuration(session.duration, isLive)}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-zinc-500">
                                                <span className="inline-flex min-w-0 items-center gap-1">
                                                    <Clock className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">{formatSessionTime(session.startTs)}</span>
                                                </span>
                                                <span className="shrink-0 text-amber-300">¥{session.totalIncome.toFixed(1)}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                                {historySessions.length === 0 && (
                                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-3 text-xs text-zinc-500">
                                        暂无历史场次
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Type Filters */}
                        <div className="grid grid-cols-4 gap-1 bg-zinc-950 p-1 rounded-md border border-zinc-800">
                            {(['all', 'super_chat', 'gift', 'guard'] as const).map((t) => (
                                <Button
                                    type="button"
                                    key={t}
                                    onClick={() => setFilterType(t)}
                                    size="sm"
                                    variant="ghost"
                                    className={cn(
                                        "inline-flex h-7 min-w-0 items-center justify-center rounded-md px-2 text-xs transition-colors",
                                        filterType === t
                                            ? "bg-zinc-800 text-white font-medium shadow-sm"
                                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                                    )}
                                >
                                    {t === 'all' ? '全部' :
                                        t === 'super_chat' ? 'SC' :
                                            t === 'gift' ? '礼物' : '舰长'}
                                </Button>
                            ))}
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-zinc-300">搜索关键词</label>
                            <Input
                                placeholder="用户名 / 内容..."
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                                className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 text-zinc-100"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-zinc-300">最低金额</label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 text-zinc-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                        </div>
                    </div>

                    <div className="flex min-h-[320px] min-w-0 flex-col rounded-lg border border-zinc-800 bg-zinc-900/50 lg:min-h-0 lg:flex-1">
                        <div className="flex items-center justify-between gap-2 border-b border-zinc-800 p-3">
                            <span className="text-sm text-zinc-400">可用记录 ({filteredSource.length})</span>
                            <div className="flex shrink-0 items-center gap-1.5">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleRefreshSource}
                                    disabled={isSessionPending}
                                    aria-label="刷新可用记录"
                                    className="inline-flex h-7 w-auto items-center justify-center gap-1.5 rounded-md px-2 text-xs text-zinc-300 hover:bg-zinc-800"
                                >
                                    <RefreshCw className={cn("h-3.5 w-3.5", isSessionPending && "animate-spin")} />
                                    <span>刷新</span>
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleImportAllVisible}
                                    disabled={filteredSource.length === 0}
                                    className="inline-flex h-7 shrink-0 items-center justify-center rounded-md px-2 text-xs text-zinc-200 hover:bg-zinc-800"
                                >
                                    全部导入
                                </Button>
                            </div>
                        </div>
                        <div className="dark-scrollbar flex-1 overflow-y-auto p-3">
                            <div className="space-y-2">
                                {filteredSource.map(item => (
                                    <DraggableTransactionCard key={item.id} transaction={item} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main: Board Area */}
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                    <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950/70 px-4 py-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                            <h2 className="text-lg font-semibold text-zinc-100">组合看板</h2>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                                {overlayCode && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const url = `${window.location.origin}/o/${overlayCode}`;
                                            navigator.clipboard.writeText(url);
                                            toast.success('OBS 链接已复制', { description: url });
                                        }}
                                        className="inline-flex items-center gap-1.5 text-purple-300 hover:text-purple-200"
                                    >
                                        <Monitor className="h-4 w-4" />
                                        OBS 源链接
                                    </button>
                                )}
                                <span className="text-zinc-500">已选择 {boardItems.length} 个项目</span>
                            </div>
                        </div>
                        <div className="flex w-full min-w-0 flex-wrap items-center gap-3 md:w-auto md:justify-end">
                            {overlayCode && (
                                <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm text-zinc-400">
                                    <div className="inline-flex items-center gap-2">
                                        <span>自动滚动</span>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-label="自动滚动"
                                            aria-checked={scrollEnabled}
                                            onClick={() => setScrollEnabled((enabled) => !enabled)}
                                            className={cn(
                                                "relative h-5 w-9 rounded-full border transition-colors",
                                                scrollEnabled
                                                    ? "border-purple-400/50 bg-purple-500"
                                                    : "border-zinc-700 bg-zinc-800"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                                                    scrollEnabled ? "translate-x-4" : "translate-x-0"
                                                )}
                                            />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span>滚动速度</span>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            value={scrollSpeed}
                                            onChange={(e) => setScrollSpeed(Number(e.target.value))}
                                            disabled={!scrollEnabled}
                                            className="h-1.5 w-20 cursor-pointer accent-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                                        />
                                        <span className="w-4 text-center text-zinc-300 tabular-nums">{scrollSpeed}</span>
                                    </div>
                                </div>
                            )}
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setBoardItems([])}
                                disabled={boardItems.length === 0}
                                className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-zinc-300 hover:bg-zinc-900"
                            >
                                清空
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleExport}
                                disabled={boardItems.length === 0}
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-zinc-100 px-3 text-zinc-950 hover:bg-white"
                            >
                                <Download className="h-4 w-4" />
                                导出图片
                            </Button>
                        </div>
                    </div>

                    {/* Scrollable Canvas Container */}
                    <div className="min-h-[360px] min-w-0 flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-[#09090b]">
                        <div className="dark-scrollbar h-full w-full overflow-auto">
                            <BoardArea items={boardItems} onRemove={handleRemoveFromBoard} />
                        </div>
                    </div>
                </div>
            </div>

            <DragOverlay>
                {activeDragItem ? (
                    <div className="opacity-90 scale-105">
                        <DraggableTransactionCard transaction={activeDragItem} isOverlay />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
