import { createDatabaseClient } from '../../src/client-factory';

const globalForDb = globalThis as unknown as {
  dbClient: ReturnType<typeof createDatabaseClient> | undefined;
};

const client =
  globalForDb.dbClient ??
  createDatabaseClient({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.dbClient = client;
}

export const db = client.db;
