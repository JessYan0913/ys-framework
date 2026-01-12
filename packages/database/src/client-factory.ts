import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as schema from './schema';

export type DatabaseClient = ReturnType<typeof createDatabaseClient>;

export function createDatabaseClient(config: PoolConfig) {
  const pool = new Pool(config);
  return {
    db: drizzle(pool, { schema }),
    pool,
  };
}
