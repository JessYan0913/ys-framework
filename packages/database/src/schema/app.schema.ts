import type { InferSelectModel } from 'drizzle-orm';
import { boolean, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

// 用户表
export const user = pgTable(
  'User',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(), // 用户主键 UUID
    name: varchar('name', { length: 100 }), // 用户昵称/展示名称
    email: varchar('email', { length: 64 }).notNull(), // 登录邮箱，唯一标识
    password: varchar('password', { length: 256 }), // 密码哈希
    phone: varchar('phone', { length: 20 }), // 手机号
    bio: text(), // 个人简介
    avatar: text(), // 头像链接
    favoriteStyle: varchar('favorite_style', { length: 50 }), // 偏好的沟通风格
    lastActive: timestamp('last_active'), // 最后活跃时间
    emailVerified: boolean('email_verified').default(false), // 邮箱是否已验证
    metadata: jsonb('metadata').default({}), // 业务扩展信息 JSON
    joinDate: timestamp('join_date').defaultNow(), // 加入时间
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(), // 记录创建时间
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()), // 记录更新时间
  },
  (table) => ({
    userEmailUniqueIdx: uniqueIndex('user_email_unique_idx').on(table.email),
  }),
);

export type User = InferSelectModel<typeof user>;
