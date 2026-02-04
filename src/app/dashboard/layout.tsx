
'use client';

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    BarChart2,
    Settings,
    LogOut,
    Menu,
    Box
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const navItems = [
        { name: "监控看板", href: "/dashboard", icon: LayoutDashboard },
        { name: "盲盒分析", href: "/dashboard/blindbox", icon: Box },
        { name: "数据分析", href: "/dashboard/analytics", icon: BarChart2 },
        { name: "切片制作", href: "/dashboard/board", icon: Settings },
    ];

    return (
        <div className="flex min-h-screen bg-zinc-950">
            {/* Mobile Sidebar Trigger */}
            <div className="lg:hidden fixed top-4 left-4 z-50">
                <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="bg-zinc-900 border-zinc-800" suppressHydrationWarning>
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 bg-zinc-900 border-r-zinc-800 p-0 text-zinc-100">
                        <div className="p-6 border-b border-zinc-800">
                            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                                Bili Monitor
                            </h1>
                        </div>
                        <nav className="flex-1 p-4 space-y-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
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
                        <div className="p-4 border-t border-zinc-800">
                            <form action={logout}>
                                <Button variant="ghost" className="w-full justify-start gap-3 text-zinc-400 hover:text-red-400 hover:bg-red-500/10">
                                    <LogOut className="h-5 w-5" />
                                    退出登录
                                </Button>
                            </form>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

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
                <div className="p-4 border-t border-zinc-800">
                    <div className="flex items-center gap-3 px-3 py-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-zinc-500">System Online</span>
                    </div>
                    <form action={logout}>
                        <Button variant="ghost" className="w-full justify-start gap-3 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                            <LogOut className="h-5 w-5" />
                            退出登录
                        </Button>
                    </form>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 lg:pl-64">
                <main className="p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen">
                    {children}
                </main>
            </div>
        </div>
    );
}
