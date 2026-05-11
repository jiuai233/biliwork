import { NextRequest } from 'next/server';
import {
    getStats,
    getRecentDanmaku,
    getRecentGifts,
    getRecentGuards,
    getRecentSuperChats,
    getBroadcasterByUid,
    getTopDanmakuUsers,
    getTopGiftUsers
} from '@/lib/data';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * SSE (Server-Sent Events) 端点
 * 替代前端 setInterval 轮询，由服务器持续推送数据更新
 * 
 * 用法: EventSource('/api/dashboard/stream?startTime=xxx&endTime=xxx')
 */
export async function GET(request: NextRequest) {
    const uid = await getSession();
    if (!uid) {
        return new Response('Unauthorized', { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');

    const start = startTime ? parseInt(startTime) : new Date().setHours(0, 0, 0, 0);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const sendData = async () => {
                try {
                    const broadcaster = await getBroadcasterByUid(uid);
                    if (!broadcaster || !broadcaster.room_id) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '找不到主播信息' })}\n\n`));
                        return;
                    }

                    const roomId = broadcaster.room_id;
                    const currentEnd = endTime ? parseInt(endTime) : Date.now();
                    const oneDayMs = 24 * 60 * 60 * 1000;
                    const previousStart = start - oneDayMs;
                    const previousEnd = currentEnd - oneDayMs;

                    const [stats, previousStats, danmaku, gifts, guards, superChats, topDanmaku, topGifts] = await Promise.all([
                        getStats(roomId, start, currentEnd),
                        getStats(roomId, previousStart, previousEnd),
                        getRecentDanmaku(roomId, 50, start, currentEnd),
                        getRecentGifts(roomId, 50, start, currentEnd),
                        getRecentGuards(roomId, 20, start, currentEnd),
                        getRecentSuperChats(roomId, 20, start, currentEnd),
                        getTopDanmakuUsers(roomId, start, currentEnd),
                        getTopGiftUsers(roomId, start, currentEnd)
                    ]);

                    const payload = JSON.stringify({
                        broadcaster,
                        stats,
                        previousStats,
                        danmaku,
                        gifts,
                        guards,
                        superChats,
                        topDanmaku,
                        topGifts,
                        timestamp: Date.now()
                    });

                    controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
                } catch (error) {
                    console.error('SSE stream error:', error);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '数据获取失败' })}\n\n`));
                }
            };

            // 立即发送第一次数据
            await sendData();

            // 每 15 秒推送一次更新
            const interval = setInterval(async () => {
                try {
                    await sendData();
                } catch {
                    clearInterval(interval);
                    controller.close();
                }
            }, 15000);

            // 客户端断开时清理
            request.signal.addEventListener('abort', () => {
                clearInterval(interval);
                controller.close();
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Nginx 不缓冲
        },
    });
}
