import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Pool } from 'pg';
import { createDatabaseClient, type DatabaseClient } from '../../src/client-factory';

@Injectable()
export class DrizzleService implements OnModuleDestroy {
  private pool: Pool;
  public readonly db: DatabaseClient['db'];

  constructor(private configService: ConfigService) {
    const connectionString = this.configService.get<string>('DATABASE_URL');
    const client = createDatabaseClient({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
    });
    this.db = client.db;
    this.pool = client.pool;
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
