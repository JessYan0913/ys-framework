import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const cacheTable = pgTable('Cache', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  ttl: integer('ttl'), // TTL in seconds
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type CacheTable = typeof cacheTable.$inferSelect;
export type NewCacheTable = typeof cacheTable.$inferInsert;