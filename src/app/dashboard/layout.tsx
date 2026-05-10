
import type { Metadata } from "next";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { requireAuth } from "@/lib/auth";
import { getBroadcasterByUid } from "@/lib/data";

export const metadata: Metadata = {
    title: "监控看板 - Bili Monitor",
    description: "B站直播间实时数据监控与分析看板",
};

/**
 * Dashboard Layout - Server Component
 * 
 * 重构：从原来的 'use client' 整个布局改为 Server Component
 * 侧边栏拆分为独立的 Client Component (Sidebar)
 * 
 * 好处：
 * - 减少客户端 JS 体积（layout 不再发送到客户端）
 * - 可以导出 SEO metadata
 * - 侧边栏的交互逻辑独立封装
 */
export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const uid = await requireAuth();
    const broadcaster = await getBroadcasterByUid(uid);

    return (
        <div className="flex min-h-screen bg-zinc-950">
            <Sidebar broadcaster={broadcaster ?? null} />

            {/* Main Content */}
            <div className="flex-1 lg:pl-64">
                <main className="p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen">
                    {children}
                </main>
            </div>
        </div>
    );
}
