'use server';

import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { signIn } from '@/lib/auth';
import { actionClient, authMiddleware } from '@/lib/safe-action';
import { type User, user } from '@ys/database';
import { db } from '@ys/database/nextjs';

/**
 * 邮箱密码登录
 */
export const emailPasswordLogin = actionClient
  .inputSchema(
    z.object({
      email: z.string().email(),
      password: z.string().min(6),
    }),
  )
  .action(async ({ parsedInput }) => {
    try {
      await signIn('credentials', {
        email: parsedInput.email,
        password: parsedInput.password,
        redirect: false,
      });
      return { success: true };
    } catch (error: any) {
      throw new Error('邮箱或密码错误');
    }
  });

/**
 * 获取用户信息（通过邮箱）
 */
export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

/**
 * 获取当前登录用户信息
 */
export const getUserInfo = actionClient.use(authMiddleware).action(async ({ ctx }) => {
  const [result] = await db.select().from(user).where(eq(user.id, ctx.user.id)).limit(1);
  if (!result) {
    throw new Error('用户不存在');
  }
  const { password, ...rest } = result;
  return rest;
});
