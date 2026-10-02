import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Guest guide and booking result pages are kept out with an
        // X-Robots-Tag header (next.config.ts) instead: a Disallow here
        // would stop Google from ever seeing that noindex.
        disallow: ['/admin', '/api'],
      },
    ],
    sitemap: 'https://villasolria.com/sitemap.xml',
  };
}
