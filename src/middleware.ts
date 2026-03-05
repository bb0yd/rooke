import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  const { pathname } = req.nextUrl;

  // Public routes that don't need auth
  const publicPaths = ['/login', '/register', '/api/auth/login', '/api/auth/register'];
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Static assets and public API paths
  if (
    pathname.startsWith('/stockfish/') ||
    pathname.startsWith('/sounds/') ||
    pathname.startsWith('/icons/') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/api/multiplayer/active')
  ) {
    return NextResponse.next();
  }

  // Redirect to login if no token
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Verify JWT signature and expiry
  try {
    await jwtVerify(token, JWT_SECRET);

    // CSRF protection for non-GET API routes
    if (pathname.startsWith('/api/') && req.method !== 'GET') {
      const csrfHeader = req.headers.get('content-type');
      // Require JSON content-type as basic CSRF protection
      // Browsers won't send cross-origin JSON POSTs without CORS preflight
      if (csrfHeader && !csrfHeader.includes('application/json')) {
        return NextResponse.json({ error: 'Invalid content type' }, { status: 403 });
      }
    }

    return NextResponse.next();
  } catch {
    // Token is invalid or expired — clear it and redirect to login
    const loginUrl = new URL('/login', req.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set('token', '', { maxAge: 0 });
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
