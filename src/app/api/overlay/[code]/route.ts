import { NextRequest } from 'next/server';
import { getOverlayItems } from '@/lib/overlay-store';

/**
 * OBS Overlay SSE 端点
 * 
 * 读取制作板同步过来的数据（组合看板上的卡片）
 * 每 2 秒推送一次，确保 OBS 和制作板保持一致
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;
    const roomId = parseInt(code, 36);

    if (isNaN(roomId) || roomId <= 0) {
        return new Response('Invalid code', { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (event: string, data: unknown) => {
                try {
                    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
                } catch { }
            };

            // 初始推送
            send('transactions', getOverlayItems(code));

            // 每 2 秒推送（快速同步）
            const interval = setInterval(() => {
                try {
                    send('transactions', getOverlayItems(code));
                } catch { }
            }, 2000);

            request.signal.addEventListener('abort', () => {
                clearInterval(interval);
                try { controller.close(); } catch { }
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
