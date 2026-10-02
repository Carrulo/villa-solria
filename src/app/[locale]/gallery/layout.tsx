import { getTranslations } from 'next-intl/server';
import { pageMetadata } from '@/lib/seo';

// The gallery page is a client component and cannot export metadata.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return pageMetadata(locale, '/gallery', t('galleryTitle'), t('galleryDescription'));
}

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
