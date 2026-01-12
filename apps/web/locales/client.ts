'use client';

import { createI18nClient } from 'next-international/client';

export const { useI18n, useCurrentLocale, useChangeLocale, useScopedI18n, I18nProviderClient } = createI18nClient({
  en: () => import('./messages/en'),
  fr: () => import('./messages/fr'),
  zh: () => import('./messages/zh'),
});
