
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/lib/types";
import { MessageSquare, Gift, Shield, CreditCard } from "lucide-react";

interface StatsPanelProps {
    stats: DashboardStats;
}

export function StatsPanel({ stats }: StatsPanelProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">今日弹幕</CardTitle>
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-zinc-100">{stats.danmakuCount}</div>
                </CardContent>
            </Card>
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">今日礼物</CardTitle>
                    <Gift className="h-4 w-4 text-pink-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-zinc-100">{stats.giftCount}</div>
                </CardContent>
            </Card>
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">今日上舰</CardTitle>
                    <Shield className="h-4 w-4 text-indigo-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-zinc-100">{stats.guardCount}</div>
                </CardContent>
            </Card>
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">预估营收</CardTitle>
                    <CreditCard className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-400">¥{stats.totalIncome}</div>
                    <p className="text-xs text-zinc-500 mt-1">含礼物、舰长、SC</p>
                </CardContent>
            </Card>
        </div>
    );
}
