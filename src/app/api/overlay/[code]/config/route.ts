import { NextRequest, NextResponse } from 'next/server';
import { getOverlayConfig, setOverlayConfig } from '@/lib/overlay-store';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;
    const roomId = parseInt(code, 36);

    if (isNaN(roomId) || roomId <= 0) {
        return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    const config = getOverlayConfig(code);
    return NextResponse.json({
        scrollSpeed: config.scrollSpeed ?? 5,
        scrollEnabled: config.scrollEnabled ?? true,
    });
}

export async function PATCH(
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
        const existing = getOverlayConfig(code);
        const merged = { ...existing, ...body };
        setOverlayConfig(code, merged);
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
}
