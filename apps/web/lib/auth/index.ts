import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { cookies } from 'next/headers';

import { authConfig } from './config';

const AUTH_API_URL = process.env.AUTH_API_URL || 'http://localhost:3001';

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
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.id;
      }
      // 将 Token 暴露给客户端或 Server Components
      session.accessToken = token.accessToken;

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
