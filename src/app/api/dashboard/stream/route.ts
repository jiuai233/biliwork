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
    let cleanupStream: () => void = () => undefined;

    const stream = new ReadableStream({
        async start(controller) {
            let closed = false;
            let interval: ReturnType<typeof setInterval> | null = null;

            const cleanup = () => {
                if (interval) {
                    clearInterval(interval);
                    interval = null;
                }

                if (closed) return;

                closed = true;
                try {
                    controller.close();
                } catch {
                    // The client or runtime may have already closed the stream.
                }
            };
            cleanupStream = cleanup;

            const enqueue = (payload: unknown) => {
                if (closed || request.signal.aborted) return;

                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
                } catch (error) {
                    console.error('SSE enqueue error:', error);
                    cleanup();
                }
            };

            const sendData = async () => {
                if (closed || request.signal.aborted) return;

                try {
                    const broadcaster = await getBroadcasterByUid(uid);
                    if (closed || request.signal.aborted) return;

                    if (!broadcaster || !broadcaster.room_id) {
                        enqueue({ error: '找不到主播信息' });
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

                    enqueue({
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
                } catch (error) {
                    console.error('SSE stream error:', error);
                    enqueue({ error: '数据获取失败' });
                }
            };

            request.signal.addEventListener('abort', cleanup, { once: true });

            // 立即发送第一次数据
            await sendData();
            if (closed || request.signal.aborted) {
                cleanup();
                return;
            }

            // 每 15 秒推送一次更新
            interval = setInterval(async () => {
                try {
                    await sendData();
                } catch {
                    cleanup();
                }
            }, 15000);

            if (closed || request.signal.aborted) cleanup();
        },
        cancel() {
            cleanupStream();
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
