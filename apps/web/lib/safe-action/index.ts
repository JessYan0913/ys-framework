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
