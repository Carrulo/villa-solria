import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    // Allow Vercel's image CDN to fetch + resize + WebP/AVIF + cache
    // photos served from Supabase Storage. Without this they'd have
    // to be marked unoptimized and skip the CDN entirely.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'esqkhahcifdtthnvlyos.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    // 1 year — Vercel keeps optimized variants until the source URL changes
    minimumCacheTTL: 31536000,
  },
};

export default withNextIntl(nextConfig);
