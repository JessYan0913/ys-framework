import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { cookies } from 'next/headers';

import { authConfig } from './config';

const AUTH_API_URL = process.env.AUTH_API_URL || 'http://localhost:3001';

// Token 刷新提前量（秒）- 在过期前 5 分钟刷新
const TOKEN_REFRESH_BUFFER = 5 * 60;

/**
 * 解析 JWT Token 获取过期时间
 */
function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.exp ? payload.exp * 1000 : null; // 转换为毫秒
  } catch {
    return null;
  }
}

/**
 * 检查 Token 是否即将过期
 */
function isTokenExpiringSoon(token: string): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true; // 无法解析时视为需要刷新
  return Date.now() >= expiry - TOKEN_REFRESH_BUFFER * 1000;
}

/**
 * 刷新 Access Token
 */
async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string } | null> {
  try {
    const res = await fetch(`${AUTH_API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      console.error('Token refresh failed:', res.status);
      return null;
    }

    const data = await res.json();
    return { accessToken: data.accessToken };
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

// 辅助函数：同步组织 Cookie（保留你原有的逻辑）
async function syncOrganizationCookie(selectedOrganizationId: string | null): Promise<void> {
  const cookieStore = await cookies();
  if (selectedOrganizationId) {
    cookieStore.set('organizationId', selectedOrganizationId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  } else {
    cookieStore.delete('organizationId');
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  session: {
    strategy: 'jwt',
    maxAge: parseInt(process.env.AUTH_SESSION_MAX_AGE || '86400', 10),
  },
  providers: [
    Credentials({
      id: 'credentials',
      name: 'NestJS Auth',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          // 1. 调用 NestJS 的登录接口
          const res = await fetch(`${AUTH_API_URL}/auth/login`, {
            method: 'POST',
            body: JSON.stringify(credentials),
            headers: { 'Content-Type': 'application/json' },
          });

          const data = await res.json();

          if (res.ok && data) {
            // 这里假设 NestJS 返回的 LoginVO 包含 user 信息和 tokens
            // 同步你原有的组织 Cookie 逻辑（如果 NestJS 返回了该信息）
            if (data.user?.metadata?.selectedOrganizationId) {
              await syncOrganizationCookie(data.user.metadata.selectedOrganizationId);
            }

            // 返回的对象会被传给 jwt 回调的 user 参数
            return {
              id: data.user.id,
              email: data.user.email,
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              // 如果有 appId 说明是应用授权
              appId: data.appId,
            };
          }
          return null;
        } catch (error) {
          console.error('NestJS Auth Error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // 初始登录时，将 NestJS 的 Token 存入 NextAuth 的 JWT 中
      if (user) {
        const u = user as any;
        token.id = u.id;
        token.accessToken = u.accessToken;
        token.refreshToken = u.refreshToken;
        token.appId = u.appId;
        token.isAppAuth = !!u.appId;
        return token;
      }

      // 检查 accessToken 是否即将过期，如果是则刷新
      if (token.accessToken && token.refreshToken) {
        const accessToken = token.accessToken as string;
        const refreshToken = token.refreshToken as string;

        if (isTokenExpiringSoon(accessToken)) {
          console.log('[Auth] Access token expiring soon, refreshing...');
          const refreshed = await refreshAccessToken(refreshToken);

          if (refreshed) {
            token.accessToken = refreshed.accessToken;
            console.log('[Auth] Access token refreshed successfully');
          } else {
            // 刷新失败，清除 token 强制重新登录
            console.error('[Auth] Token refresh failed, user needs to re-login');
            token.error = 'RefreshAccessTokenError';
          }
        }
      }

      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.id;
      }
      // 将 Token 暴露给客户端或 Server Components
      session.accessToken = token.accessToken;

      // 传递 token 刷新错误到 session
      if (token.error) {
        session.error = token.error;
      }

      if (token.isAppAuth) {
        session.appAuth = { appId: token.appId };
      }
      return session;
    },
  },
  events: {
    async signOut() {
      try {
        // 获取当前 session 以访问 accessToken
        const session = await auth();

        // 1. 清除本地组织 Cookie
        await syncOrganizationCookie(null);

        // 2. 调用 NestJS 的 logout 接口使后端 Token 失效
        if ((session as any)?.accessToken) {
          await fetch(`${AUTH_API_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              authorization: `Bearer ${(session as any).accessToken}`,
            },
          });
        }

        // 3. 结束 OIDC 会话，使所有 SSO 客户端的 token 失效
        if (session?.user?.id) {
          await fetch(`${AUTH_API_URL}/oidc/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: session.user.id }),
          });
        }
      } catch (error) {
        console.error('NestJS Logout Error:', error);
        // 即使后端 logout 失败，也继续执行本地登出逻辑
      }
    },
  },
  // 保持你原有的配置
  pages: {
    error: '/auth/error',
  },
  trustHost: true,
});
