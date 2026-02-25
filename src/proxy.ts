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
const MAX_AUTH_REQUESTS = 10; // Max 10 auth requests per minute per IP

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.ip || '127.0.0.1';

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

  let response: NextResponse;

  // Allow public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    response = NextResponse.next();
  } else {
    // Check for Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

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

      response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Add Security Headers
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return response;
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
