import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);

const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/login',
  '/register',
  '/_next',
  '/favicon.ico',
];
// Simple in-memory rate limit for Auth (Note: This is per-instance/process)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_AUTH_REQUESTS = 15; // Max 15 auth requests per minute per IP

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = (request as any).ip || request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

  // Apply rate limiting to Auth routes
  if (pathname.startsWith('/api/auth/')) {
    const now = Date.now();
    const rateLimit = rateLimitMap.get(ip) || { count: 0, lastReset: now };

    if (now - rateLimit.lastReset > RATE_LIMIT_WINDOW) {
      rateLimit.count = 0;
      rateLimit.lastReset = now;
    }

    rateLimit.count++;
    rateLimitMap.set(ip, rateLimit);

    if (rateLimit.count > MAX_AUTH_REQUESTS) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
  }

  // Check for Authorization header OR accessToken cookie
  const authHeader = request.headers.get('Authorization');
  const cookieToken = request.cookies.get('accessToken')?.value;
  const token = authHeader?.split(' ')[1] || cookieToken;

  const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path));

  // If user is logged in and tries to access login/register, redirect to dashboard
  if (token && (pathname === '/login' || pathname === '/register')) {
     try {
        await jwtVerify(token, ACCESS_SECRET);
        return NextResponse.redirect(new URL('/dashboard', request.url));
     } catch (e) {
        // Token invalid, let them stay on login page
     }
  }

  if (isPublicPath) {
    return NextResponse.next();
  }

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Verify token using jose (Edge compatible)
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    
    // Pass user info to downstream via headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-role', payload.role as string);

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Add Security & CORS Headers
    response.headers.set('X-DNS-Prefetch-Control', 'off');
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    // CORS (Strict)
    const origin = request.headers.get('origin');
    const allowedOrigins = [process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'];
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    return response;
  } catch (error) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (handled inside middleware)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
