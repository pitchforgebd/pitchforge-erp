import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { securityHeaders } from './lib/security/headers.ts';

/** Pages open without a session. Everything else is denied by default. */
const PUBLIC_PATHS = ['/login', '/two-factor', '/reset-password', '/session-expired'];
const SESSION_COOKIE = '__Host-pf_session';

function isPublic(pathname: string): boolean {
  return (
    pathname.startsWith('/bff/') ||
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  );
}

/**
 * Runs before every page. It sets a fresh CSP nonce and the security headers, and sends anyone
 * without a session cookie to the login page. This is a convenience, not the control: the API
 * authorises every request.
 */
export function proxy(request: NextRequest): NextResponse {
  const nonce = globalThis.crypto.randomUUID().replaceAll('-', '');
  const headers = securityHeaders({ nonce, development: process.env.NODE_ENV === 'development' });
  const csp = headers['content-security-policy'] ?? '';

  const hasSession = request.cookies.has(SESSION_COOKIE);
  const response =
    isPublic(request.nextUrl.pathname) || hasSession
      ? NextResponse.next({ request: { headers: withNonce(request, nonce, csp) } })
      : NextResponse.redirect(new URL('/login', request.url));

  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
  return response;
}

/** Next.js reads the nonce from these request headers and applies it to its own scripts. */
function withNonce(request: NextRequest, nonce: string, csp: string): Headers {
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('content-security-policy', csp);
  return headers;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
