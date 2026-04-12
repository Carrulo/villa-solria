import { getTranslations } from 'next-intl/server';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function FaqLayout({ children, params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'faq' });

  const faqItems = Array.from({ length: 10 }, (_, i) => ({
    '@type': 'Question' as const,
    name: t(`q${i + 1}`),
    acceptedAnswer: {
      '@type': 'Answer' as const,
      text: t(`a${i + 1}`),
    },
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
