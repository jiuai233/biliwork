"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DateRange = { from?: Date; to?: Date };

interface AnalyticsDateRangePickerProps {
    date: DateRange | undefined;
    setDate: (date: DateRange | undefined) => void;
    onApply?: (date: DateRange) => void;
    pending?: boolean;
}

const weekDays = ["一", "二", "三", "四", "五", "六", "日"];

function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
    const next = startOfDay(date);
    next.setDate(next.getDate() + amount);
    return next;
}

function addMonths(date: Date, amount: number) {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function shiftMonth(date: Date, amount: number) {
    const target = new Date(date.getFullYear(), date.getMonth() + amount, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
}

function isSameDay(a: Date | undefined, b: Date | undefined) {
    return Boolean(a && b
        && a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate());
}

function isInRange(day: Date, from: Date | undefined, to: Date | undefined) {
    if (!from || !to) return false;
    const time = startOfDay(day).getTime();
    const first = startOfDay(from).getTime();
    const last = startOfDay(to).getTime();
    return time >= Math.min(first, last) && time <= Math.max(first, last);
}

function getCalendarDays(month: Date) {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = addDays(firstDay, -startOffset);
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function formatShortDate(date: Date) {
    return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function formatInputDate(date: Date | undefined) {
    if (!date) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseInputDate(value: string) {
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return undefined;
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}

function formatTriggerLabel(range: DateRange | undefined) {
    const from = range?.from;
    const to = range?.to ?? from;
    if (!from || !to) return "选择日期";

    const today = startOfDay(new Date());
    if (isSameDay(from, today) && isSameDay(to, today)) return "今天";
    const yesterday = addDays(today, -1);
    if (isSameDay(from, yesterday) && isSameDay(to, yesterday)) return "昨天";
    if (isSameDay(from, to)) return `${from.getFullYear()}/${formatShortDate(from)}`;
    if (from.getFullYear() === to.getFullYear()) return `${from.getFullYear()}/${formatShortDate(from)} – ${formatShortDate(to)}`;
    return `${from.getFullYear()}/${formatShortDate(from)} – ${to.getFullYear()}/${formatShortDate(to)}`;
}

function getPresetRange(key: string): DateRange {
    const today = startOfDay(new Date());
    if (key === "yesterday") {
        const yesterday = addDays(today, -1);
        return { from: yesterday, to: yesterday };
    }
    if (key === "last3") return { from: addDays(today, -2), to: today };
    if (key === "last7") return { from: addDays(today, -6), to: today };
    if (key === "last14") return { from: addDays(today, -13), to: today };
    if (key === "lastMonth") return { from: shiftMonth(today, -1), to: today };
    return { from: today, to: today };
}

function getInitialVisibleMonth(range: DateRange | undefined) {
    const selected = range?.from ?? new Date();
    const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const selectedMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
    return selectedMonth.getTime() >= currentMonth.getTime() ? addMonths(currentMonth, -1) : selectedMonth;
}

const presets = [
    ["today", "今天"],
    ["yesterday", "昨天"],
    ["last3", "近3日"],
    ["last7", "近7日"],
    ["last14", "近14日"],
    ["lastMonth", "近一个月"],
] as const;

export function AnalyticsDateRangePicker({ date, setDate, onApply, pending = false }: AnalyticsDateRangePickerProps) {
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const restoreFocusRef = React.useRef(false);
    const panelRef = React.useRef<HTMLDivElement>(null);
    const [open, setOpen] = React.useState(false);
    const [draft, setDraft] = React.useState<DateRange>(date ?? {});
    const [customMode, setCustomMode] = React.useState(false);
    const [selectingEnd, setSelectingEnd] = React.useState(false);
    const [hoverDay, setHoverDay] = React.useState<Date>();
    const [visibleMonth, setVisibleMonth] = React.useState(() => getInitialVisibleMonth(date));
    const [panelPosition, setPanelPosition] = React.useState<{ top: number; left: number; width: number }>();

    const updatePanelPosition = React.useCallback(() => {
        if (!wrapperRef.current) return;
        const rect = wrapperRef.current.getBoundingClientRect();
        const desktop = window.innerWidth >= 768;
        const width = Math.min(customMode && desktop ? 720 : 340, window.innerWidth - 24);
        const estimatedHeight = customMode ? (desktop ? 450 : 580) : 330;
        const below = rect.bottom + 8;
        const top = below + estimatedHeight <= window.innerHeight - 12
            ? below
            : Math.max(12, rect.top - estimatedHeight - 8);
        setPanelPosition({
            top,
            left: Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width)),
            width,
        });
    }, [customMode]);

    React.useLayoutEffect(() => {
        if (!open) return;
        updatePanelPosition();
        window.addEventListener("resize", updatePanelPosition);
        window.addEventListener("scroll", updatePanelPosition, true);
        return () => {
            window.removeEventListener("resize", updatePanelPosition);
            window.removeEventListener("scroll", updatePanelPosition, true);
        };
    }, [open, updatePanelPosition]);

    React.useEffect(() => {
        if (!open) return;
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (!wrapperRef.current?.contains(target) && !panelRef.current?.contains(target)) {
                setOpen(false);
            }
        };
        document.addEventListener("pointerdown", handlePointerDown);
        return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, [open]);

    React.useEffect(() => {
        if (!open) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
                triggerRef.current?.focus();
                return;
            }
            if (event.key !== "Tab" || !panelRef.current) return;
            const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
                'button:not(:disabled), input:not(:disabled)',
            )).filter((element) => element.offsetParent !== null);
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("button:not(:disabled):not(.hidden)")?.focus());
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open, customMode]);

    React.useEffect(() => {
        if (!open && !pending && restoreFocusRef.current) {
            restoreFocusRef.current = false;
            triggerRef.current?.focus();
        }
    }, [open, pending]);

    const openPicker = () => {
        setDraft(date ?? {});
        setCustomMode(false);
        setSelectingEnd(false);
        setHoverDay(undefined);
        setVisibleMonth(getInitialVisibleMonth(date));
        updatePanelPosition();
        setOpen(true);
    };

    const closePicker = (deferFocus = false) => {
        setOpen(false);
        setSelectingEnd(false);
        setHoverDay(undefined);
        restoreFocusRef.current = true;
        if (!deferFocus) requestAnimationFrame(() => {
            restoreFocusRef.current = false;
            triggerRef.current?.focus();
        });
    };

    const selectDay = (day: Date) => {
        const selected = startOfDay(day);
        if (selected.getTime() > startOfDay(new Date()).getTime()) return;
        if (!selectingEnd) {
            setDraft({ from: selected });
            setSelectingEnd(true);
            return;
        }
        const from = draft.from ?? selected;
        setDraft(from.getTime() <= selected.getTime()
            ? { from, to: selected }
            : { from: selected, to: from });
        setSelectingEnd(false);
        setHoverDay(undefined);
    };

    const selectPreset = (key: string) => {
        if (pending) return;
        const range = getPresetRange(key);
        setDate(range);
        onApply?.(range);
        closePicker(true);
    };

    const validDraft = Boolean(
        draft.from
        && draft.to
        && draft.from.getTime() <= draft.to.getTime()
        && draft.to.getTime() <= startOfDay(new Date()).getTime()
    );

    const applyDraft = () => {
        if (!draft.from || !draft.to || selectingEnd || !validDraft) return;
        const next = { from: draft.from, to: draft.to };
        setDate(next);
        onApply?.(next);
        closePicker(true);
    };

    const renderMonth = (month: Date, side: "first" | "second") => {
        const days = getCalendarDays(month);
        const previewEnd = selectingEnd ? hoverDay : draft.to;
        const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const canMoveNext = addMonths(visibleMonth, 1).getTime() < currentMonth.getTime();
        return (
            <div className={side === "second" ? "hidden md:block" : undefined}>
                <div className="mb-2 flex h-8 items-center justify-between">
                    {side === "first" ? (
                        <Button type="button" variant="ghost" size="sm" aria-label="上个月" className="h-8 w-8 p-0" onClick={() => setVisibleMonth((current) => addMonths(current, -1))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    ) : <span className="w-8" />}
                    <div className="text-sm font-semibold text-foreground">{month.getFullYear()}年{month.getMonth() + 1}月</div>
                    {side === "second" ? (
                        <Button type="button" variant="ghost" size="sm" aria-label="下个月" disabled={!canMoveNext} className="h-8 w-8 p-0" onClick={() => setVisibleMonth((current) => addMonths(current, 1))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    ) : <span className="w-8 md:hidden" />}
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                    {weekDays.map((weekday) => <div key={weekday} className="h-7 text-xs font-medium leading-7 text-muted-foreground">{weekday}</div>)}
                    {days.map((day) => {
                        const outside = day.getMonth() !== month.getMonth();
                        const future = day.getTime() > startOfDay(new Date()).getTime();
                        const selectedStart = isSameDay(day, draft.from);
                        const selectedEnd = isSameDay(day, draft.to);
                        const range = isInRange(day, draft.from, previewEnd);
                        return (
                            <button
                                key={`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`}
                                type="button"
                                disabled={future}
                                aria-label={`${day.getFullYear()}年${day.getMonth() + 1}月${day.getDate()}日`}
                                aria-pressed={selectedStart || selectedEnd}
                                onClick={() => selectDay(day)}
                                onMouseEnter={() => selectingEnd && setHoverDay(day)}
                                className={cn(
                                    "h-8 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                                    outside ? "text-muted-foreground/40" : "text-secondary-foreground",
                                    future && "cursor-not-allowed opacity-25",
                                    range && !selectedStart && !selectedEnd && "bg-primary/15 text-primary",
                                    (selectedStart || selectedEnd) ? "bg-primary font-semibold text-white" : !future && "hover:bg-accent",
                                )}
                            >
                                {day.getDate()}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    const calendarPanel = open && panelPosition && typeof document !== "undefined" ? createPortal(
        <div
            ref={panelRef}
            role="dialog"
            aria-label="选择日期范围"
            aria-modal="true"
            className="fixed z-[9999] max-h-[calc(100vh-24px)] overflow-y-auto rounded-xl border border-border bg-popover shadow-2xl shadow-black/60"
            style={panelPosition}
        >
            <div className={cn(customMode && "grid md:grid-cols-[120px_minmax(0,1fr)]")}>
                <div className={cn(
                    "flex flex-col gap-1 p-2",
                    customMode && "border-b border-border md:border-b-0 md:border-r md:p-3",
                )}>
                    {presets.map(([key, label]) => (
                        <button key={key} type="button" disabled={pending} onClick={() => selectPreset(key)} className={cn("rounded-md px-3 py-2 text-left text-sm text-secondary-foreground transition hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50", customMode && "hidden md:block")}>
                            {label}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => {
                            setDraft(date ?? {});
                            setVisibleMonth(getInitialVisibleMonth(date));
                            setCustomMode((current) => !current);
                        }}
                        className={cn(
                            "rounded-md px-3 py-2 text-left text-sm font-medium transition hover:bg-accent",
                            customMode ? "bg-primary/15 text-primary" : "text-secondary-foreground",
                        )}
                    >
                        {customMode ? "返回快捷选择" : "自定义"}
                    </button>
                </div>
                {customMode && <div className="p-3">
                    <div className="mb-3 grid gap-2 border-b border-border pb-3 md:grid-cols-[1fr_1fr_132px]">
                        <label className="space-y-1 text-xs text-muted-foreground">
                            <span>开始日期</span>
                            <input
                                type="date"
                                value={formatInputDate(draft.from)}
                                max={formatInputDate(new Date())}
                                onChange={(event) => {
                                    setDraft((current) => ({ ...current, from: parseInputDate(event.target.value) }));
                                    setSelectingEnd(false);
                                }}
                                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
                            />
                        </label>
                        <label className="space-y-1 text-xs text-muted-foreground">
                            <span>结束日期</span>
                            <input
                                type="date"
                                value={formatInputDate(draft.to)}
                                max={formatInputDate(new Date())}
                                onChange={(event) => {
                                    setDraft((current) => ({ ...current, to: parseInputDate(event.target.value) }));
                                    setSelectingEnd(false);
                                }}
                                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
                            />
                        </label>
                        <label className="space-y-1 text-xs text-muted-foreground">
                            <span>跳转月份</span>
                            <input
                                type="month"
                                value={`${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, "0")}`}
                                max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`}
                                onChange={(event) => {
                                    const [year, month] = event.target.value.split("-").map(Number);
                                    if (year && month) setVisibleMonth(new Date(year, month - 1, 1));
                                }}
                                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
                            />
                        </label>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        {renderMonth(visibleMonth, "first")}
                        {renderMonth(addMonths(visibleMonth, 1), "second")}
                    </div>
                    <div className="sticky bottom-0 mt-3 flex items-center justify-between border-t border-border bg-popover pt-3">
                        <span className="text-xs text-muted-foreground">
                            {selectingEnd ? "请选择结束日期" : formatTriggerLabel(draft)}
                        </span>
                        <div className="flex gap-2">
                            <Button type="button" size="sm" variant="ghost" className="h-8 px-3" onClick={() => closePicker()}>取消</Button>
                            <Button type="button" size="sm" disabled={!validDraft || selectingEnd || pending} className="h-8 min-w-[68px] bg-primary px-3 text-white hover:bg-primary/90" onClick={applyDraft}>
                                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "应用"}
                            </Button>
                        </div>
                    </div>
                </div>}
            </div>
        </div>,
        document.body,
    ) : null;

    return (
        <div ref={wrapperRef} className="relative inline-block">
            <Button
                ref={triggerRef}
                type="button"
                variant="secondary"
                aria-haspopup="dialog"
                aria-expanded={open}
                disabled={pending}
                className="inline-flex h-9 min-w-[210px] items-center justify-between gap-3 whitespace-nowrap rounded-lg border border-border bg-secondary px-3 text-sm font-medium text-foreground shadow-sm hover:bg-accent"
                onClick={open ? () => closePicker() : openPicker}
            >
                <span>{formatTriggerLabel(date)}</span>
                <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Button>
            {calendarPanel}
        </div>
    );
}
