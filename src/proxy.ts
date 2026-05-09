import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname;

    if (path.startsWith('/admin')) {
        if (path === '/admin/login') {
            return NextResponse.next();
        }

        const adminSession = request.cookies.get('admin_session');
        if (!adminSession) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }
    }

    if (path.startsWith('/dashboard')) {
        const authSession = request.cookies.get('auth_session');
        if (!authSession) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/dashboard/:path*'],
};
