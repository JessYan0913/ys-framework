import { createI18nServer } from 'next-international/server';

export const { getI18n, getCurrentLocale, getScopedI18n, getStaticParams } = createI18nServer({
  en: () => import('./messages/en'),
  fr: () => import('./messages/fr'),
  zh: () => import('./messages/zh'),
});
