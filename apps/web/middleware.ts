import { createI18nMiddleware } from 'next-international/middleware';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';

const locales = ['en', 'fr', 'zh'];
const defaultLocale = 'zh';

const I18nMiddleware = createI18nMiddleware({
  locales,
  defaultLocale,
});

/**
 * 中间件执行顺序：
 * 1. NextAuth 认证检查（由 auth() 包装器提供）
 * 2. 国际化路由处理（仅对非 API 路由）
 */
export default auth(async (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;

  // API 路由跳过国际化处理
  if (pathname.startsWith('/api/') || pathname.startsWith('/.well-known/')) {
    return;
  }

  // 检查是否缺少 locale，并重定向到默认
  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`,
  );

  if (pathnameIsMissingLocale) {
    // 重定向到默认 locale，例如 / -> /en，同时保留查询参数
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(url);
  }

  return I18nMiddleware(request);
});

export const config = {
  // 排除静态资源、API 路由和系统文件
  matcher: ['/', '/((?!api|nest|static|.*\\..*|_next|favicon.ico|robots.txt).*)'],
};
