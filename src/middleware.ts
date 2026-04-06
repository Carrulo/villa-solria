import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // Skip i18n middleware for admin and api routes
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
    return;
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/', '/(pt|en|es|de)/:path*', '/admin/:path*']
};
