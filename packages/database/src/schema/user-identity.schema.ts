import { pgTable, serial, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { user } from './app.schema';

export const userAuthIdentities = pgTable(
  'UserAuthIdentity',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // 'feishu', 'phone', 'email', 'wechat', etc.
    providerUserId: text('provider_user_id').notNull(),
    unionId: text('union_id'),
    openId: text('open_id'),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at'),
    raw: text('raw'), // JSON string of raw provider data
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    providerUserIdx: uniqueIndex('provider_user_idx').on(table.provider, table.providerUserId),
  }),
);

export type UserAuthIdentityRow = typeof userAuthIdentities.$inferSelect;
export type UserAuthIdentityInsert = typeof userAuthIdentities.$inferInsert;
