"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";

export type Theme = "dark" | "light";

/** Must match the inline init script in app/layout.tsx. */
const STORAGE_KEY = "biweb-theme";
const THEME_EVENT = "biweb-theme-change";

function applyTheme(theme: Theme) {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
        window.localStorage.setItem(STORAGE_KEY, theme);
    } catch { /* storage blocked */ }
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}

function subscribe(callback: () => void) {
    window.addEventListener(THEME_EVENT, callback);
    return () => window.removeEventListener(THEME_EVENT, callback);
}

function getSnapshot(): Theme {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function useTheme(): Theme {
    return useSyncExternalStore(subscribe, getSnapshot, () => "dark");
}

export function ThemeToggle({ className }: { className?: string }) {
    const theme = useTheme();
    const isDark = theme === "dark";

    return (
        <button
            type="button"
            aria-label={isDark ? "切换到白天模式" : "切换到黑暗模式"}
            title={isDark ? "白天模式" : "黑暗模式"}
            onClick={() => applyTheme(isDark ? "light" : "dark")}
            className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-accent/40 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                className,
            )}
        >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
    );
}

export function ThemeAwareToaster() {
    const theme = useTheme();
    return <Toaster richColors position="top-center" theme={theme} />;
}
