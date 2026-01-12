import { createMiddleware, createSafeActionClient } from 'next-safe-action';
import { cookies } from 'next/headers';

import { auth } from '@/lib/auth';

// Create the client with default options.
export const actionClient = createSafeActionClient({
  handleServerError: (error: Error) => {
    // Return the actual error message if it's a known error
    return error.message;
  },
});

// 基础认证中间件 - 验证用户登录状态
export const authMiddleware = createMiddleware().define(async ({ next }) => {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('用户未登录');
  }

  const cookieStore = await cookies();
  const organizationId = cookieStore.get('organizationId')?.value;

  return next({
    ctx: {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      organizationId,
    },
  });
});

// 组织权限中间件 - 验证用户在指定组织中的角色
export const organizationAuthMiddleware = (requiredRole: 'member' | 'admin' = 'member') =>
  createMiddleware().define(async ({ next }) => {
    const session = await auth();

    if (!session?.user?.id) {
      throw new Error('用户未登录');
    }

    const cookieStore = await cookies();
    const organizationId = cookieStore.get('organizationId')?.value;
    if (!organizationId) {
      throw new Error('请选择组织');
    }

    // 动态导入避免循环依赖
    const { db } = await import('@ys/database/nextjs');
    const { organizationMembers } = await import('@ys/database');
    const { eq, and } = await import('drizzle-orm');

    const membership = await db
      .select({ role: organizationMembers.role, status: organizationMembers.status })
      .from(organizationMembers)
      .where(
        and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, session.user.id)),
      )
      .limit(1);

    if (membership.length === 0) {
      throw new Error('您不是该组织的成员');
    }

    const member = membership[0];
    if (member.status !== 'active') {
      throw new Error('您在该组织中的状态异常');
    }

    if (requiredRole === 'admin' && member.role !== 'admin') {
      throw new Error('您没有该组织的管理员权限');
    }

    return next({
      ctx: {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        },
        organizationRole: member.role,
        organizationId,
      },
    });
  });
