import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // Skip i18n middleware for admin, api and team-facing routes that don't
  // need locale negotiation (cleaning dashboard is token-gated and uses
  // its own PT-only chrome).
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/cleaning')
  ) {
    return;
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!_next|images|favicon|api|admin|cleaning).*)', '/', '/(pt|en|es|de)/:path*']
};
