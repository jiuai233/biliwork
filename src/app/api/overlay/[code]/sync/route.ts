import { NextRequest, NextResponse } from 'next/server';
import { setOverlayItems } from '@/lib/overlay-store';

/**
 * 制作板同步接口
 * POST /api/overlay/[code]/sync
 * 
 * 制作板每次改变选中项时，POST 当前项列表到此接口
 * OBS 叠加层的 SSE 会读取存储的数据
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;
    const roomId = parseInt(code, 36);

    if (isNaN(roomId) || roomId <= 0) {
        return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const items = Array.isArray(body) ? body : [];
        setOverlayItems(code, items);
        return NextResponse.json({ ok: true, count: items.length });
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
}
