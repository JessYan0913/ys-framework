import { boolean, index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { user } from './app.schema';
import { InferSelectModel } from 'drizzle-orm';

export const notification = pgTable(
  'Notification',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    type: varchar('type', { length: 50 }).default('info'),
    isRead: boolean('is_read').default(false).notNull(),
    data: jsonb('data').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('notification_user_id_idx').on(table.userId),
    userIdIsReadIdx: index('notification_user_id_is_read_idx').on(table.userId, table.isRead),
  }),
);

export type Notification = InferSelectModel<typeof notification>;
