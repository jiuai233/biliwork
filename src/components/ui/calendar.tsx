"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { zhCN } from "date-fns/locale";

// Import default react-day-picker styles for v9
import "react-day-picker/style.css";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    const defaultClassNames = getDefaultClassNames();

    return (
        <DayPicker
            locale={zhCN}
            showOutsideDays={showOutsideDays}
            className={cn(defaultClassNames.root, "p-3", className)}
            classNames={{
                // Extend default classNames with dark theme overrides
                today: `border-purple-500`,
                selected: `bg-purple-600 text-white`,
                range_start: `bg-purple-600 text-white`,
                range_end: `bg-purple-600 text-white`,
                range_middle: `bg-purple-600/20`,
                chevron: `${defaultClassNames.chevron} fill-zinc-400`,
                caption_label: `text-zinc-100`,
                nav: `${defaultClassNames.nav}`,
                weekday: `text-zinc-500`,
                day: `text-zinc-300 hover:bg-zinc-800 rounded-md`,
                outside: `text-zinc-600 opacity-50`,
                disabled: `text-zinc-600`,
                ...classNames,
            }}
            components={{
                Chevron: (props) => {
                    if (props.orientation === "left") {
                        return <ChevronLeft className="h-4 w-4" />;
                    }
                    return <ChevronRight className="h-4 w-4" />;
                },
            }}
            {...props}
        />
    );
}
Calendar.displayName = "Calendar";

export { Calendar };
