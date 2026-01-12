import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { Cache } from '../interfaces/cache.interface';

@Injectable()
export class RedisService implements Cache, OnModuleDestroy {
  private readonly client: RedisClientType;

  constructor(
    private readonly config: {
      url: string;
    },
  ) {
    this.client = createClient({ url: this.config.url });
    this.client.on('error', (err) => {
      console.error('[RedisService] Redis Client Error', err);
    });
    void this.client.connect();
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const payload = JSON.stringify(value);
    if (ttl) {
      await this.client.set(key, payload, { EX: ttl });
      return;
    }
    await this.client.set(key, payload);
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (value === null) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
