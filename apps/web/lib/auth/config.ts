import type { NextAuthConfig } from 'next-auth';

// 公共路由配置 - 无需登录即可访问的页面
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/auth-failed',
  '/silent-login',
  '/protocol/user-agreement',
  '/protocol/privacy-policy',
  '/protocol/information-collection',
  '/protocol/permission-application',
  '/protocol/registration-instructions',
];

// 检查路径是否为公共路由
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.includes(route));
}

const LOCALE_PREFIX_REGEX = /^\/(en|fr|zh)(?:\/|$)/;
const APP_TOKEN_LOGIN_PATH = '/app/token-login';

function extractLocale(pathname: string): string | null {
  const match = pathname.match(LOCALE_PREFIX_REGEX);
  return match ? match[1] : null;
}

function stripLocalePrefix(pathname: string): string {
  const locale = extractLocale(pathname);
  if (!locale) {
    return pathname;
  }
  return pathname.substring(locale.length + 1) || '/';
}

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isAppTokenLoginRoute(pathname: string): boolean {
  console.log('pathname', pathname);
  const withoutLocale = normalizePath(stripLocalePrefix(pathname));
  console.log('withoutLocale', withoutLocale);
  return withoutLocale === APP_TOKEN_LOGIN_PATH;
}

function buildAppTokenLoginPath(pathname: string): string {
  const locale = extractLocale(pathname);
  return locale ? `/${locale}${APP_TOKEN_LOGIN_PATH}` : APP_TOKEN_LOGIN_PATH;
}

export const authConfig = {
  pages: {
    signIn: '/login',
    newUser: '/',
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {
    /**
     * 登录后重定向处理
     */
    async redirect({ url, baseUrl }) {
      // 如果 URL 在当前域名下，直接跳转
      if (url.startsWith(baseUrl)) return url;
      // 否则跳转到首页
      return baseUrl;
    },
    /**
     * 权限控制回调 - 在每个请求时执行
     * 处理顺序：
     * 1. API 路由认证
     * 2. PDF 渲染页面（公开访问）
     * 3. 应用页面（需要登录或 app token 认证）
     * 4. 公共页面（登录/注册/忘记密码）
     * 5. 受保护页面（需要登录）
     */
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // 路由类型判断
      const isPublicPage = isPublicRoute(pathname);
      const isApiRoute = pathname.startsWith('/api');
      const isPdfRender = /^\/(en|fr|zh)\/pdf-render\//.test(pathname) || pathname.startsWith('/pdf-render/');
      const isAppRoute = /^\/(en|fr|zh)?\/app\//.test(pathname) || pathname.startsWith('/app/');
      const isOidcProxyRoute = pathname === '/api/oidc-proxy';

      // 1. OIDC 代理路由 - 允许公开访问（内部会处理登录重定向）
      if (isOidcProxyRoute) {
        return true;
      }

      // 2. API 路由认证 - 未登录返回 401
      if (isApiRoute) {
        if (!isLoggedIn) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return true;
      }

      // 2. PDF 渲染页面 - 允许公开访问
      if (isPdfRender) {
        return true;
      }

      // 3. 应用页面处理 - 需要登录或 app token 认证
      if (isAppRoute) {
        if (isAppTokenLoginRoute(pathname)) {
          // 放行 token 登录路由，避免循环重定向
          return true;
        }

        if (isLoggedIn) {
          return true;
        }

        // 检查是否有 token 参数
        const token = nextUrl.searchParams.get('token');

        if (!token) {
          // 没有 token 参数，重定向到 auth-failed 页面
          return Response.redirect(new URL('/auth-failed', nextUrl.origin));
        }
        // 构造绝对 URL，避免 Next.js 中间件关于相对 URL 的错误
        const loginPath = buildAppTokenLoginPath(pathname);
        const loginUrl = new URL(loginPath, nextUrl.origin);
        loginUrl.searchParams.set('token', token);
        // 登录后返回当前访问的 app 页面
        loginUrl.searchParams.set('redirect', nextUrl.pathname);

        return Response.redirect(loginUrl);
      }

      // 4. 公共页面处理
      if (isPublicPage) {
        // 已登录用户访问公共页面，重定向到首页
        if (isLoggedIn) {
          return Response.redirect(new URL('/', nextUrl as unknown as URL));
        }
        // 未登录用户可以访问
        return true;
      }

      // 5. 受保护页面 - 未登录重定向到登录页
      if (!isLoggedIn) {
        const loginUrl = new URL('/login', nextUrl.origin);
        loginUrl.searchParams.set('callbackUrl', nextUrl.href);
        return Response.redirect(loginUrl);
      }

      // 已登录用户访问受保护页面
      return true;
    },
  },
} satisfies NextAuthConfig;
