import { NextRequest, NextResponse } from 'next/server';
import { getOverlayItems } from '@/lib/overlay-store';

/**
 * OBS Overlay 轮询 fallback
 * 读取制作板同步的数据
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;
    const roomId = parseInt(code, 36);

    if (isNaN(roomId) || roomId <= 0) {
        return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    return NextResponse.json(getOverlayItems(code));
}
