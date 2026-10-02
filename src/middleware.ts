import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // Skip i18n middleware for admin and api routes, which don't need
  // locale negotiation.
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
    return;
  }
  return intlMiddleware(request);
}

export const config = {
  // Anything with a file extension (robots.txt, sitemap.xml, og-image.jpg)
  // must bypass next-intl, or it gets rewritten to /pt/robots.txt and 404s
  // — which is how the site went without robots and sitemap.
  matcher: ['/((?!_next|_vercel|images|favicon|api|admin|.*\\..*).*)', '/', '/(pt|en|es|de)/:path*']
};
