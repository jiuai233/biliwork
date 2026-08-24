
import type { Metadata } from "next";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { hasLiveAuthCode } from "@/lib/access";
import { requireAuth } from "@/lib/auth";
import { getBroadcasterByUid } from "@/lib/data";
import { redirect } from "next/navigation";

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
    if (!hasLiveAuthCode(broadcaster?.auth_code)) {
        redirect('/gift');
    }

    return (
        <div className="flex min-h-screen bg-background lg:h-screen lg:overflow-hidden">
            <Sidebar broadcaster={broadcaster ?? null} />

            {/* Main Content */}
            <div className="min-w-0 flex-1 lg:h-full lg:pl-64">
                {/* overflow-y-auto: below the flex-fit breakpoints pages may exceed the viewport; scroll stays inside main. */}
                <a
                    href="#dashboard-main"
                    className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow"
                >
                    跳到内容
                </a>
                <main id="dashboard-main" className="min-h-screen w-full min-w-0 px-4 pb-6 pt-20 sm:px-6 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:p-6 xl:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
