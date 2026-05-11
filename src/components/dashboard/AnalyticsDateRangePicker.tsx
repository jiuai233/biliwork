"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { DateRange } from "react-day-picker";

interface AnalyticsDateRangePickerProps {
    date: DateRange | undefined;
    setDate: (date: DateRange | undefined) => void;
}

const weekDays = ["一", "二", "三", "四", "五", "六", "日"];

function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date | undefined, b: Date | undefined) {
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

function isInRange(day: Date, from: Date | undefined, to: Date | undefined) {
    if (!from || !to) return false;
    const time = day.getTime();
    return time >= startOfDay(from).getTime() && time <= startOfDay(to).getTime();
}

function formatDisplayDate(date: Date | undefined) {
    if (!date) return "请选择";
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function getCalendarDays(month: Date) {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - startOffset);

    return Array.from({ length: 42 }, (_, index) => {
        const day = new Date(gridStart);
        day.setDate(gridStart.getDate() + index);
        return day;
    });
}

export function AnalyticsDateRangePicker({ date, setDate }: AnalyticsDateRangePickerProps) {
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const panelRef = React.useRef<HTMLDivElement>(null);
    const [open, setOpen] = React.useState(false);
    const [selectingFrom, setSelectingFrom] = React.useState<Date | null>(null);
    const [visibleMonth, setVisibleMonth] = React.useState(() => date?.from ?? new Date());
    const [panelPosition, setPanelPosition] = React.useState<{ top: number; left: number } | null>(null);

    const from = date?.from;
    const to = date?.to ?? date?.from;
    const days = React.useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);

    React.useEffect(() => {
        if (date?.from) setVisibleMonth(date.from);
    }, [date?.from]);

    const updatePanelPosition = React.useCallback(() => {
        if (!wrapperRef.current) return;
        const rect = wrapperRef.current.getBoundingClientRect();
        const panelWidth = 292;
        const viewportPadding = 12;
        setPanelPosition({
            top: rect.bottom + 8,
            left: Math.max(
                viewportPadding,
                Math.min(window.innerWidth - panelWidth - viewportPadding, rect.right - panelWidth)
            ),
        });
    }, []);

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
                setSelectingFrom(null);
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, [open]);

    const moveMonth = (offset: number) => {
        setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
    };

    const selectDay = (day: Date) => {
        const selected = startOfDay(day);

        if (!selectingFrom) {
            setSelectingFrom(selected);
            setDate({ from: selected, to: selected });
            return;
        }

        const start = selectingFrom.getTime() <= selected.getTime() ? selectingFrom : selected;
        const end = selectingFrom.getTime() <= selected.getTime() ? selected : selectingFrom;
        setDate({ from: start, to: end });
        setSelectingFrom(null);
        setOpen(false);
    };

    const selectToday = () => {
        const today = startOfDay(new Date());
        setVisibleMonth(today);
        setSelectingFrom(null);
        setDate({ from: today, to: today });
        setOpen(false);
    };

    const toggleOpen = () => {
        if (!open) updatePanelPosition();
        setOpen((value) => !value);
    };

    const calendarPanel = open && panelPosition && typeof document !== "undefined" ? createPortal(
        <div
            ref={panelRef}
            className="fixed z-[9999] w-[292px] rounded-xl border border-white/10 bg-zinc-950 p-3 shadow-2xl shadow-black/60"
            style={{ top: panelPosition.top, left: panelPosition.left }}
        >
            <div className="mb-3 flex items-center justify-between">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg p-0 text-zinc-300 hover:bg-zinc-800"
                    onClick={() => moveMonth(-1)}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-semibold text-zinc-100">
                    {visibleMonth.getFullYear()}年{visibleMonth.getMonth() + 1}月
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg p-0 text-zinc-300 hover:bg-zinc-800"
                    onClick={() => moveMonth(1)}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
                {weekDays.map((day) => (
                    <div key={day} className="h-7 text-xs font-medium leading-7 text-zinc-500">
                        {day}
                    </div>
                ))}
                {days.map((day) => {
                    const outside = day.getMonth() !== visibleMonth.getMonth();
                    const selectedStart = isSameDay(day, from);
                    const selectedEnd = isSameDay(day, to);
                    const range = isInRange(day, from, to);

                    return (
                        <button
                            key={day.toISOString()}
                            type="button"
                            onClick={() => selectDay(day)}
                            className={[
                                "h-8 rounded-md text-sm transition-colors",
                                outside ? "text-zinc-700" : "text-zinc-200",
                                range && !selectedStart && !selectedEnd ? "bg-blue-500/15 text-blue-100" : "",
                                selectedStart || selectedEnd ? "bg-blue-600 font-semibold text-white" : "hover:bg-zinc-800",
                            ].join(" ")}
                        >
                            {day.getDate()}
                        </button>
                    );
                })}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3">
                <span className="text-xs text-zinc-500">
                    {selectingFrom ? "选择结束日期" : "选择开始日期"}
                </span>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-zinc-300 hover:bg-zinc-800"
                    onClick={selectToday}
                >
                    今天
                </Button>
            </div>
        </div>,
        document.body
    ) : null;

    return (
        <div ref={wrapperRef} className="relative inline-block">
            <Button
                type="button"
                variant="secondary"
                className="inline-flex h-10 min-w-[270px] flex-row items-center justify-between gap-3 whitespace-nowrap rounded-xl border border-white/10 bg-slate-900/70 px-3 text-sm font-medium text-zinc-100 shadow-sm hover:bg-slate-800/80"
                onClick={toggleOpen}
            >
                <span>{formatDisplayDate(from)} - {formatDisplayDate(to)}</span>
                <CalendarDays className="h-4 w-4 shrink-0 text-zinc-400" />
            </Button>
            {calendarPanel}
        </div>
    );
}
