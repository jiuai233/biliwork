'use client';

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    BarChart2,
    Settings,
    LogOut,
    MessageCircle,
    Menu,
    X,
    Box,
    Radio,
    ChevronUp
} from "lucide-react";
import { Avatar } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth";
import type { Broadcaster } from "@/lib/types";
import { DashboardNoticeDialog } from "./DashboardNoticeDialog";

const NOTICE_DISMISSED_KEY = "bili-dashboard-notice-dismissed";
const NOTICE_LAST_SHOWN_KEY = "bili-dashboard-notice-last-shown";

const navItems = [
    { name: "监控看板", href: "/dashboard", icon: LayoutDashboard },
    { name: "盲盒分析", href: "/dashboard/blindbox", icon: Box },
    { name: "开播记录", href: "/dashboard/live", icon: Radio },
    { name: "数据分析", href: "/dashboard/analytics", icon: BarChart2 },
    { name: "数据排行", href: "/dashboard/ranking", icon: BarChart2 },
    { name: "切片制作", href: "/dashboard/board", icon: Settings },
];

function normalizeAvatarSrc(src: string | null | undefined): string | undefined {
    if (!src) return undefined;
    if (src.startsWith("//")) return `https:${src}`;
    if (src.startsWith("http://")) return src.replace(/^http:\/\//, "https://");
    return src;
}

function getTodayKey() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
}

function SidebarUserMenu({
    broadcaster,
    mobile = false,
    onNoticeOpen,
}: {
    broadcaster: Broadcaster | null;
    mobile?: boolean;
    onNoticeOpen: () => void;
}) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const avatarSrc = normalizeAvatarSrc(broadcaster?.uface);
    const name = broadcaster?.uname || "主播";

    useEffect(() => {
        if (!open) return;

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (target instanceof Node && !menuRef.current?.contains(target)) {
                setOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
            }
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
                <div className="absolute bottom-[calc(100%+8px)] left-0 z-20 w-full rounded-xl border border-white/10 bg-zinc-950 p-2 shadow-2xl shadow-black/40">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            onNoticeOpen();
                            setOpen(false);
                        }}
                        className="mb-1 inline-flex h-10 w-full items-center justify-start gap-2 rounded-lg px-3 text-zinc-300 hover:bg-white/[0.06]"
                    >
                        <MessageCircle className="h-4 w-4" />
                        问题反馈
                    </Button>
                    <form action={logout}>
                        <Button
                            type="submit"
                            variant="ghost"
                            className="inline-flex h-10 w-full items-center justify-start gap-2 rounded-lg px-3 text-red-300 hover:bg-red-500/10"
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
                    "flex h-auto w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/[0.06]",
                    mobile && "bg-zinc-950/60"
                )}
            >
                <span className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0 border border-violet-400/50">
                        <Avatar.Image src={avatarSrc} referrerPolicy="no-referrer" />
                        <Avatar.Fallback>{name[0] ?? "主"}</Avatar.Fallback>
                    </Avatar>
                    <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-zinc-100">{name}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                            <span className={cn("h-1.5 w-1.5 rounded-full", broadcaster?.active ? "bg-emerald-400" : "bg-red-400")} />
                            {broadcaster?.active ? "监控中" : "已暂停"}
                        </span>
                    </span>
                </span>
                <ChevronUp className={cn("h-4 w-4 shrink-0 text-zinc-500 transition-transform", open && "rotate-180")} />
            </Button>
        </div>
    );
}

/**
 * 侧边栏客户端组件
 * 从 layout.tsx 中拆分出来，使 layout 可以作为 Server Component
 */
export function Sidebar({ broadcaster }: { broadcaster: Broadcaster | null }) {
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [noticeOpen, setNoticeOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    useEffect(() => {
        try {
            const dismissed = window.localStorage.getItem(NOTICE_DISMISSED_KEY) === "true";
            const lastShown = window.localStorage.getItem(NOTICE_LAST_SHOWN_KEY);
            const today = getTodayKey();

            if (dismissed) {
                setDontShowAgain(true);
                return;
            }

            if (lastShown !== today) {
                window.localStorage.setItem(NOTICE_LAST_SHOWN_KEY, today);
                setNoticeOpen(true);
            }
        } catch {
            setNoticeOpen(true);
        }
    }, []);

    const persistNoticePreference = () => {
        try {
            if (dontShowAgain) {
                window.localStorage.setItem(NOTICE_DISMISSED_KEY, "true");
            } else {
                window.localStorage.removeItem(NOTICE_DISMISSED_KEY);
            }
        } catch { }
    };

    const handleNoticeOpenChange = (open: boolean) => {
        if (!open) {
            persistNoticePreference();
        }
        setNoticeOpen(open);
    };

    const handleNoticeConfirm = () => {
        persistNoticePreference();
        setNoticeOpen(false);
    };

    return (
        <>
            {/* Mobile Sidebar Trigger */}
            <div className="lg:hidden fixed top-4 left-4 z-50">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border-zinc-800 bg-zinc-900 p-0"
                    onClick={() => setIsSidebarOpen(true)}
                >
                    <Menu className="h-5 w-5" />
                </Button>
            </div>

            {isSidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button
                        type="button"
                        aria-label="关闭菜单"
                        className="absolute inset-0 bg-black/60"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                    <aside className="relative flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-900 text-zinc-100 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-zinc-800 p-6">
                            <h1 className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-xl font-bold text-transparent">
                                Bili Monitor
                            </h1>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-zinc-400"
                                onClick={() => setIsSidebarOpen(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <nav className="flex-1 space-y-2 p-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 rounded-md px-3 py-2 transition-colors",
                                        pathname === item.href
                                            ? "bg-purple-500/10 text-purple-400"
                                            : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.name}
                                </Link>
                            ))}
                        </nav>
                        <div className="border-t border-zinc-800 p-4">
                            <SidebarUserMenu
                                broadcaster={broadcaster}
                                mobile
                                onNoticeOpen={() => setNoticeOpen(true)}
                            />
                        </div>
                    </aside>
                </div>
            )}

            {/* Desktop Sidebar */}
            <div className="hidden lg:flex flex-col w-64 border-r border-zinc-800 bg-zinc-900/50 backdrop-blur-xl fixed h-full">
                <div className="p-6 border-b border-zinc-800">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                        Bili Monitor
                    </h1>
                    <p className="text-xs text-zinc-500 mt-1">Live Data Analytics</p>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                                pathname === item.href
                                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            {item.name}
                        </Link>
                    ))}
                </nav>
                <div className="border-t border-zinc-800 p-4">
                    <SidebarUserMenu
                        broadcaster={broadcaster}
                        onNoticeOpen={() => setNoticeOpen(true)}
                    />
                </div>
            </div>

            <DashboardNoticeDialog
                open={noticeOpen}
                dontShowAgain={dontShowAgain}
                onDontShowAgainChange={setDontShowAgain}
                onOpenChange={handleNoticeOpenChange}
                onConfirm={handleNoticeConfirm}
            />
        </>
    );
}
