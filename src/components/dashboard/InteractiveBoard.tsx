
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
} from "@dnd-kit/sortable";
import { domToPng } from "modern-screenshot";
import { Transaction } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DraggableTransactionCard } from "./DraggableTransactionCard";
import { SortableBoardItem } from "./SortableBoardItem";
import { BILI_CARD_WIDTH } from "@/components/bilibili/TransactionCard";
import {
    type BoardTransaction,
    isSourceConsumed,
    mergeTransactionsIntoBoard,
} from "@/lib/board-merge";
import { ChevronDown, Clock, Download, Loader2, Monitor, Radio, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getBoardTransactionsForSession, getRecentBoardTransactions } from "@/app/dashboard/board/actions";

type BoardSession = {
    id: number;
    startTs: number;
    endTs: number | null;
    duration: number;
    title: string | null;
    areaName: string | null;
    totalIncome: number;
};

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
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4 min-h-[400px] w-full">
                        <div className="p-4 rounded-full bg-muted/60 border border-border">
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
    const [sessionPickerOpen, setSessionPickerOpen] = useState(false);
    const [isSessionPending, startSessionTransition] = useTransition();
    const sessionRequestRef = React.useRef(0);

    // Filters
    const [searchName, setSearchName] = useState("");
    const [minPrice, setMinPrice] = useState("");
    const [filterType, setFilterType] = useState<'all' | 'super_chat' | 'gift' | 'guard'>('all');
    const [isMounted, setIsMounted] = useState(false);
    const [scrollSpeed, setScrollSpeed] = useState(5);
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const [boardHydrated, setBoardHydrated] = useState(!overlayCode);
    const [configHydrated, setConfigHydrated] = useState(!overlayCode);
    const currentSession = initialSessions.find((session) => !session.endTs);
    const historySessions = initialSessions.filter((session) => session.endTs);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    // 挂载时从 overlay config 恢复滚动设置
    React.useEffect(() => {
        if (!overlayCode || !isMounted) return;
        const controller = new AbortController();
        setConfigHydrated(false);
        fetch(`/api/overlay/${overlayCode}/config`, { signal: controller.signal })
            .then((res) => {
                if (!res.ok) throw new Error(`Config restore failed: ${res.status}`);
                return res.json();
            })
            .then((config) => {
                if (typeof config.scrollSpeed !== "number" || typeof config.scrollEnabled !== "boolean") {
                    throw new Error("Config restore returned invalid data");
                }
                if (controller.signal.aborted) return;
                setScrollSpeed(config.scrollSpeed);
                setScrollEnabled(config.scrollEnabled);
                setConfigHydrated(true);
            })
            .catch((error) => {
                if (!controller.signal.aborted) {
                    console.error(error);
                    toast.error("读取 OBS 滚动配置失败，已停止自动写入");
                }
            });
        return () => controller.abort();
    }, [overlayCode, isMounted]);

    // 挂载时从 overlay store 恢复 board 状态
    React.useEffect(() => {
        if (!overlayCode || !isMounted) return;
        const controller = new AbortController();
        setBoardHydrated(false);
        fetch(`/api/overlay/${overlayCode}/poll`, { signal: controller.signal })
            .then((res) => {
                if (!res.ok) throw new Error(`Board restore failed: ${res.status}`);
                return res.json();
            })
            .then((data) => {
                if (!Array.isArray(data)) throw new Error("Board restore returned invalid data");
                if (controller.signal.aborted) return;
                setBoardItems(data);
                setBoardHydrated(true);
            })
            .catch((error) => {
                if (!controller.signal.aborted) {
                    console.error(error);
                    toast.error("读取已保存看板失败，已停止自动同步");
                }
            });
        return () => controller.abort();
    }, [overlayCode, isMounted]);

    // 自动同步 board 状态到 OBS 叠加层
    React.useEffect(() => {
        if (!overlayCode || !isMounted || !boardHydrated) return;

        const controller = new AbortController();
        const timer = setTimeout(() => {
            fetch(`/api/overlay/${overlayCode}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(boardItems),
                signal: controller.signal,
            }).catch(() => { });
        }, 500); // 500ms 防抖

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [boardItems, overlayCode, isMounted, boardHydrated]);

    // 同步滚动设置到 OBS config
    React.useEffect(() => {
        if (!overlayCode || !isMounted || !configHydrated) return;

        const controller = new AbortController();
        const timer = setTimeout(() => {
            fetch(`/api/overlay/${overlayCode}/config`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scrollSpeed, scrollEnabled }),
                signal: controller.signal,
            }).catch(() => { });
        }, 500);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [scrollSpeed, scrollEnabled, overlayCode, isMounted, configHydrated]);

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
        setSessionPickerOpen(false);
    };

    const handleSelectSession = (session: BoardSession) => {
        const sessionKey = String(session.id);
        const requestId = sessionRequestRef.current + 1;
        sessionRequestRef.current = requestId;
        setSelectedSessionId(sessionKey);
        setSessionPickerOpen(false);
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
        setSessionPickerOpen(false);
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
        return <div className="h-[calc(100vh-200px)] flex items-center justify-center text-muted-foreground">Loading Board...</div>;
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
                if (oldIndex < 0 || newIndex < 0) return items;
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

    const handleAddToBoard = (item: Transaction) => {
        setBoardItems((items) => mergeTransactionsIntoBoard(items, [item]));
    };

    const selectedSessionLabel = selectedSessionId === "recent"
        ? "最近记录"
        : selectedSessionId === "current"
            ? "当前场次"
            : initialSessions.find((session) => String(session.id) === selectedSessionId)?.title || "直播场次";

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
            const cardWidth = firstCard ? `${firstCard.offsetWidth}px` : `${BILI_CARD_WIDTH}px`;

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
            <div className="flex min-w-0 flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-4">
                {/* Sidebar: Source List */}
                <div className="flex w-full min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card lg:w-[360px] lg:shrink-0">
                    <div className="relative z-20 shrink-0 space-y-3 border-b border-border p-3">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Search className="w-4 h-4" /> 筛选记录
                        </h3>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setSessionPickerOpen((open) => !open)}
                                aria-expanded={sessionPickerOpen}
                                className="flex h-9 w-full items-center justify-between rounded-md border border-border bg-background px-3 text-left text-sm transition hover:bg-accent"
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    <Radio className="h-4 w-4 shrink-0 text-purple-300" />
                                    <span className="truncate font-medium text-foreground">{selectedSessionLabel}</span>
                                </span>
                                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                                    {sourceItems.length} 条
                                    <ChevronDown className={cn("h-4 w-4 transition-transform", sessionPickerOpen && "rotate-180")} />
                                </span>
                            </button>
                            {sessionPickerOpen && (
                                <div className="dark-scrollbar absolute left-0 right-0 top-full z-50 mt-1 max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border bg-popover p-1.5 shadow-2xl">
                                {isSessionPending && (
                                    <span className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        加载中
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={handleSelectRecent}
                                    className={cn(
                                        "w-full rounded-md px-3 py-2 text-left transition",
                                        selectedSessionId === "recent"
                                            ? "bg-purple-500/15 text-foreground"
                                            : "text-muted-foreground hover:bg-accent"
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-semibold">最近记录</span>
                                        <span className="text-xs text-muted-foreground">{initialTransactions.length} 条</span>
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground">不限制场次，显示最近交易</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSelectCurrentSession}
                                    disabled={!currentSession}
                                    className={cn(
                                        "w-full rounded-md px-3 py-2 text-left transition",
                                        selectedSessionId === "current"
                                            ? "bg-emerald-500/15 text-foreground"
                                            : "text-muted-foreground hover:bg-accent",
                                        !currentSession && "cursor-not-allowed opacity-55 hover:bg-muted/40"
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-semibold text-foreground">当前场次</span>
                                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                                            {currentSession ? "直播中" : "未检测"}
                                        </span>
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground">
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
                                                "w-full rounded-md px-3 py-2 text-left transition",
                                                selected
                                                    ? "bg-blue-500/15 text-foreground"
                                                    : "text-muted-foreground hover:bg-accent"
                                            )}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                                                    {session.title || "直播场次"}
                                                </span>
                                                <span className={cn(
                                                    "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                                                    isLive ? "bg-emerald-500/15 text-emerald-300" : "bg-muted text-muted-foreground"
                                                )}>
                                                    {formatSessionDuration(session.duration, isLive)}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
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
                                    <div className="px-3 py-3 text-xs text-muted-foreground">
                                        暂无历史场次
                                    </div>
                                )}
                                </div>
                            )}
                        </div>
                        {/* Type Filters */}
                        <div className="grid grid-cols-4 gap-1 bg-muted/40 p-1 rounded-md border border-border">
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
                                            ? "bg-primary/20 text-primary font-medium shadow-sm"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                    )}
                                >
                                    {t === 'all' ? '全部' :
                                        t === 'super_chat' ? 'SC' :
                                            t === 'gift' ? '礼物' : '舰长'}
                                </Button>
                            ))}
                        </div>
                        <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-2">
                            <label className="sr-only" htmlFor="board-search">搜索关键词</label>
                            <Input
                                id="board-search"
                                placeholder="用户名 / 内容..."
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                                className="h-9 w-full rounded-md border border-border bg-background text-foreground"
                            />
                            <label className="sr-only" htmlFor="board-min-price">最低金额</label>
                            <Input
                                id="board-min-price"
                                type="number"
                                placeholder="最低 ¥"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                className="h-9 w-full rounded-md border border-border bg-background text-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                        </div>
                    </div>
                    <div className="flex min-h-[320px] min-w-0 flex-1 flex-col lg:min-h-0">
                        <div className="flex items-center justify-between gap-2 border-b border-border p-3">
                            <span className="text-sm text-muted-foreground">可用记录 ({filteredSource.length})</span>
                            <div className="flex shrink-0 items-center gap-1.5">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleRefreshSource}
                                    disabled={isSessionPending}
                                    aria-label="刷新可用记录"
                                    className="inline-flex h-7 w-auto items-center justify-center gap-1.5 rounded-md px-2 text-xs text-secondary-foreground hover:bg-accent"
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
                                    className="inline-flex h-7 shrink-0 items-center justify-center rounded-md px-2 text-xs text-foreground hover:bg-accent"
                                >
                                    全部导入
                                </Button>
                            </div>
                        </div>
                        <div className="dark-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
                            <div className="space-y-1.5">
                                {filteredSource.map(item => (
                                    <DraggableTransactionCard key={item.id} transaction={item} onAdd={handleAddToBoard} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main: Board Area */}
                <div className="flex min-w-0 flex-1 flex-col gap-3 lg:min-h-0">
                    <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                            <h2 className="text-lg font-semibold text-foreground">组合看板</h2>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                                {overlayCode && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const url = `${window.location.origin}/o/${overlayCode}`;
                                            navigator.clipboard.writeText(url);
                                            toast.success('OBS 链接已复制', { description: url });
                                        }}
                                        className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80"
                                    >
                                        <Monitor className="h-4 w-4" />
                                        OBS 源链接
                                    </button>
                                )}
                                <span className="text-muted-foreground">已选择 {boardItems.length} 个项目</span>
                            </div>
                        </div>
                        <div className="flex w-full min-w-0 flex-wrap items-center gap-3 md:w-auto md:justify-end">
                            {overlayCode && (
                                <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm text-muted-foreground">
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
                                                    : "border-border bg-muted"
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
                                            className="h-1.5 w-20 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                                        />
                                        <span className="w-4 text-center text-secondary-foreground tabular-nums">{scrollSpeed}</span>
                                    </div>
                                </div>
                            )}
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setBoardItems([])}
                                disabled={boardItems.length === 0}
                                className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-secondary-foreground hover:bg-accent"
                            >
                                清空
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleExport}
                                disabled={boardItems.length === 0}
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-primary-foreground hover:bg-primary/90"
                            >
                                <Download className="h-4 w-4" />
                                导出图片
                            </Button>
                        </div>
                    </div>

                    {/* Scrollable Canvas Container */}
                    <div className="min-h-[360px] min-w-0 flex-1 overflow-hidden rounded-xl border border-border checkerboard">
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
