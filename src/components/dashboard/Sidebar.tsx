'use client';

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    BarChart2,
    BarChart3,
    CalendarRange,
    LogOut,
    MessageCircle,
    Menu,
    X,
    Box,
    Radio,
    ChevronDown,
    ChevronUp,
    Clapperboard,
    Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/shared/theme";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth";
import type { Broadcaster } from "@/lib/types";
import { DashboardNoticeDialog } from "./DashboardNoticeDialog";

type NavItem = {
    name: string;
    href: string;
    icon: typeof LayoutDashboard;
};

type NavGroup = {
    id: string;
    label?: string;
    items: NavItem[];
};

const navGroups: NavGroup[] = [
    {
        id: "overview",
        items: [{ name: "监控看板", href: "/dashboard", icon: LayoutDashboard }],
    },
    {
        id: "gifts",
        label: "礼物收益",
        items: [
            { name: "礼物流水", href: "/dashboard/gift-stream", icon: Gift },
            { name: "盲盒分析", href: "/dashboard/blindbox", icon: Box },
        ],
    },
    {
        id: "live",
        label: "直播数据",
        items: [
            { name: "开播记录", href: "/dashboard/live", icon: Radio },
            { name: "数据分析", href: "/dashboard/analytics", icon: BarChart3 },
            { name: "数据排行", href: "/dashboard/ranking", icon: BarChart2 },
        ],
    },
    {
        id: "tools",
        label: "报告工具",
        items: [
            { name: "周报", href: "/dashboard/report", icon: CalendarRange },
            { name: "切片制作", href: "/dashboard/board", icon: Clapperboard },
        ],
    },
];

function isNavActive(pathname: string, href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarUserMenu({ broadcaster, mobile = false }: { broadcaster: Broadcaster | null; mobile?: boolean }) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const name = broadcaster?.uname || "主播";

    useEffect(() => {
        if (!open) return;
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (target instanceof Node && !menuRef.current?.contains(target)) setOpen(false);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    return (
        <div ref={menuRef} className="relative">
            {open && (
                <div className="absolute bottom-[calc(100%+8px)] left-0 z-20 w-full rounded-xl border border-border bg-popover p-2 shadow-xl">
                    <form action={logout}>
                        <Button
                            type="submit"
                            variant="ghost"
                            className="inline-flex h-10 w-full items-center justify-start gap-2 rounded-lg px-3 text-red-400 hover:bg-red-500/10"
                        >
                            <LogOut className="h-4 w-4" />
                            退出登录
                        </Button>
                    </form>
                </div>
            )}
            <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className={cn(
                    "flex h-auto w-full items-center justify-between rounded-xl border border-border bg-accent/40 p-3 text-left hover:bg-accent",
                    mobile && "bg-card",
                )}
            >
                <span className="flex min-w-0 items-center gap-3">
                    <Avatar src={broadcaster?.uface} name={name} className="h-9 w-9 border-primary/40" />
                    <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className={cn("h-1.5 w-1.5 rounded-full", broadcaster?.active ? "bg-emerald-400" : "bg-red-400")} />
                            {broadcaster?.active ? "监控中" : "已暂停"}
                        </span>
                    </span>
                </span>
                <ChevronUp className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
            </Button>
        </div>
    );
}

function FeedbackSidebarButton({ onClick }: { onClick: () => void }) {
    return (
        <Button
            type="button"
            variant="ghost"
            data-testid="dashboard-feedback-entry"
            onClick={onClick}
            className="group flex h-auto w-full items-center justify-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-3 text-left hover:border-sky-400/30 hover:bg-sky-500/15"
        >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-400/25 bg-sky-400/10 text-sky-300">
                <MessageCircle className="h-4 w-4" />
            </span>
            <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">问题反馈</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">加入 QQ 群反馈问题</span>
            </span>
        </Button>
    );
}

function NavLink({ item, active, onNavigate, nested = false }: { item: NavItem; active: boolean; onNavigate?: () => void; nested?: boolean }) {
    const Icon = item.icon;
    return (
        <Link
            href={item.href}
            onClick={onNavigate}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                nested && "py-2",
                active
                    ? "border border-primary/25 bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
        >
            <Icon className={cn("shrink-0", nested ? "h-4 w-4" : "h-5 w-5")} />
            {item.name}
        </Link>
    );
}

function NavGroups({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
    const activeGroupId = navGroups.find((group) => group.items.some((item) => isNavActive(pathname, item.href)))?.id;
    const [openIds, setOpenIds] = useState<Set<string>>(() => {
        const ids = new Set<string>(["gifts"]);
        if (activeGroupId) ids.add(activeGroupId);
        return ids;
    });

    useEffect(() => {
        if (!activeGroupId) return;
        setOpenIds((current) => {
            if (current.has(activeGroupId)) return current;
            const next = new Set(current);
            next.add(activeGroupId);
            return next;
        });
    }, [activeGroupId]);

    const toggle = (id: string) => {
        setOpenIds((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <>
            {navGroups.map((group) => {
                if (!group.label) {
                    return group.items.map((item) => (
                        <NavLink
                            key={item.href}
                            item={item}
                            active={isNavActive(pathname, item.href)}
                            onNavigate={onNavigate}
                        />
                    ));
                }

                const open = openIds.has(group.id);
                const groupActive = group.items.some((item) => isNavActive(pathname, item.href));
                return (
                    <div key={group.id} className="space-y-1">
                        <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => toggle(group.id)}
                            className={cn(
                                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold tracking-wide",
                                groupActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {group.label}
                            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
                        </button>
                        {open && (
                            <div className="ml-2 space-y-1 border-l border-border pl-2">
                                {group.items.map((item) => (
                                    <NavLink
                                        key={item.href}
                                        item={item}
                                        nested
                                        active={isNavActive(pathname, item.href)}
                                        onNavigate={onNavigate}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </>
    );
}

export function Sidebar({ broadcaster }: { broadcaster: Broadcaster | null }) {
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [noticeOpen, setNoticeOpen] = useState(false);

    const brand = (
        <div>
            <h1 className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-xl font-bold text-transparent">
                Bili Monitor
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">Live Data Analytics</p>
        </div>
    );

    return (
        <>
            <div className="fixed left-4 top-4 z-50 lg:hidden">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="打开菜单"
                    data-testid="mobile-menu-button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-border bg-card p-0"
                    onClick={() => setIsSidebarOpen(true)}
                >
                    <Menu className="h-5 w-5" />
                </Button>
            </div>

            {isSidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button type="button" aria-label="关闭菜单" className="absolute inset-0 bg-black/60" onClick={() => setIsSidebarOpen(false)} />
                    <aside className="relative flex h-full w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground shadow-2xl">
                        <div className="flex items-center justify-between border-b border-border p-6">{brand}</div>
                        <Button type="button" variant="ghost" size="sm" className="absolute right-4 top-5 h-8 w-8 p-0" onClick={() => setIsSidebarOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
                            <NavGroups pathname={pathname} onNavigate={() => setIsSidebarOpen(false)} />
                            <div className="pt-3">
                                <FeedbackSidebarButton onClick={() => { setNoticeOpen(true); setIsSidebarOpen(false); }} />
                            </div>
                        </nav>
                        <div className="flex items-center gap-3 border-t border-border p-4">
                            <div className="min-w-0 flex-1">
                                <SidebarUserMenu broadcaster={broadcaster} mobile />
                            </div>
                            <ThemeToggle />
                        </div>
                    </aside>
                </div>
            )}

            <aside className="fixed hidden h-full w-64 flex-col border-r border-border bg-sidebar/95 backdrop-blur-xl lg:flex">
                <div className="flex items-start justify-between border-b border-border p-6">
                    {brand}
                    <ThemeToggle />
                </div>
                <nav className="flex-1 space-y-2 overflow-y-auto p-4">
                    <NavGroups pathname={pathname} />
                </nav>
                <div className="space-y-3 border-t border-border p-4">
                    <FeedbackSidebarButton onClick={() => setNoticeOpen(true)} />
                    <SidebarUserMenu broadcaster={broadcaster} />
                </div>
            </aside>

            <DashboardNoticeDialog open={noticeOpen} onOpenChange={setNoticeOpen} onConfirm={() => setNoticeOpen(false)} />
        </>
    );
}
