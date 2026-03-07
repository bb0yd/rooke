import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { rateLimit } from '@/lib/rateLimit';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

const AUTH_RATE_LIMIT_PATHS = ['/api/auth/login', '/api/auth/register'];
const MULTIPART_API_PATHS = new Set(['/api/users/avatar']);

function hasSameOriginContext(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (origin) return origin === req.nextUrl.origin;

  const referer = req.headers.get('referer');
  return referer ? referer.startsWith(req.nextUrl.origin) : false;
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  const { pathname } = req.nextUrl;

  // Rate limit auth endpoints (POST only)
  if (req.method === 'POST' && AUTH_RATE_LIMIT_PATHS.some(p => pathname.startsWith(p))) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const { allowed, retryAfterMs } = rateLimit(ip, 10, 60_000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
        }
      );
    }
  }

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
      const contentType = req.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const isMultipart = contentType.includes('multipart/form-data');

      if (isMultipart) {
        if (!MULTIPART_API_PATHS.has(pathname) || !hasSameOriginContext(req)) {
          return NextResponse.json({ error: 'Invalid content type' }, { status: 403 });
        }
      } else if (contentType && !isJson) {
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
