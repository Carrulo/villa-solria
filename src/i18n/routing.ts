import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['pt', 'en', 'es', 'de'],
  defaultLocale: 'pt',
  localePrefix: 'as-needed'
});
