"use client";

import { Tabs as HeroTabs } from "@heroui/react";
import { cn } from "@/lib/utils";

/**
 * Styled wrappers over HeroUI v3 Tabs (react-aria based).
 * The project does not load @heroui/styles, so all styling lives here.
 */

export const Tabs = HeroTabs;

interface TabListProps {
    "aria-label": string;
    children: React.ReactNode;
    className?: string;
}

export function TabList({ children, className, ...props }: TabListProps) {
    return (
        <HeroTabs.List
            {...props}
            className={cn(
                "inline-flex w-fit items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5",
                className,
            )}
        >
            {children}
        </HeroTabs.List>
    );
}

interface TabProps {
    id: string;
    children: React.ReactNode;
    className?: string;
    "data-testid"?: string;
}

export function Tab({ id, children, className, ...props }: TabProps) {
    return (
        <HeroTabs.Tab
            id={id}
            {...props}
            className={cn(
                "inline-flex h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-semibold text-muted-foreground outline-none transition-colors",
                "hover:bg-accent hover:text-foreground",
                "focus-visible:ring-2 focus-visible:ring-primary/40",
                "data-[selected]:bg-primary/15 data-[selected]:text-primary",
                className,
            )}
        >
            {children}
        </HeroTabs.Tab>
    );
}

interface TabPanelProps {
    id: string;
    children: React.ReactNode;
    className?: string;
}

export function TabPanel({ id, children, className }: TabPanelProps) {
    return (
        <HeroTabs.Panel id={id} className={cn("outline-none", className)}>
            {children}
        </HeroTabs.Panel>
    );
}
