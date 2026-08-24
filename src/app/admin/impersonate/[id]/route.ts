import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { getAdminSession } from '@/app/admin/actions';
import { homePathForAuthCode } from '@/lib/access';
import { getBroadcasterById } from '@/lib/data';
import {
    broadcasterSessionOptions,
    passwordStamp,
    type BroadcasterSessionData,
} from '@/lib/session';

function getRedirectUrl(request: NextRequest, path: string) {
    const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.SITE_URL;
    if (configuredOrigin) {
        return new URL(path, configuredOrigin);
    }

    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    const host = forwardedHost || request.headers.get('host')?.split(',')[0]?.trim();
    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const proto = forwardedProto || (host?.startsWith('localhost') || host?.startsWith('127.0.0.1') ? 'http' : 'https');

    if (host) {
        return new URL(path, `${proto}://${host}`);
    }

    return new URL(path, request.url);
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const wantsJson = request.nextUrl.searchParams.get('format') === 'json' ||
        request.headers.get('accept')?.includes('application/json');
    const adminUsername = await getAdminSession();
    if (!adminUsername) {
        if (wantsJson) {
            return NextResponse.json({ success: false, redirectTo: '/admin/login' }, { status: 401 });
        }
        return NextResponse.redirect(getRedirectUrl(request, '/admin/login'));
    }

    const { id } = await params;
    const broadcasterId = Number(id);
    if (!Number.isInteger(broadcasterId) || broadcasterId <= 0) {
        if (wantsJson) {
            return NextResponse.json({ success: false, redirectTo: '/admin' }, { status: 400 });
        }
        return NextResponse.redirect(getRedirectUrl(request, '/admin'));
    }

    const broadcaster = await getBroadcasterById(broadcasterId);
    if (!broadcaster?.uid) {
        if (wantsJson) {
            return NextResponse.json({ success: false, redirectTo: '/admin' }, { status: 404 });
        }
        return NextResponse.redirect(getRedirectUrl(request, '/admin'));
    }

    const session = await getIronSession<BroadcasterSessionData>(await cookies(), broadcasterSessionOptions());
    session.uid = broadcaster.uid;
    session.userId = broadcaster.user_id ?? undefined;
    session.isLoggedIn = true;
    session.pwdv = passwordStamp(broadcaster.password_hash);
    await session.save();

    const home = homePathForAuthCode(broadcaster.auth_code);
    if (wantsJson) {
        return NextResponse.json({ success: true, redirectTo: home });
    }

    return NextResponse.redirect(getRedirectUrl(request, home));
}
