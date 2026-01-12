import { DynamicModule, Global, Module } from '@nestjs/common';
import { RedisService } from './redis/redis.service';

type RedisConfig = {
  url: string;
};

export type ForRootOptions = {
  config?: RedisConfig;
};

@Global()
@Module({})
export class CacheModule {
  static forRoot(options?: ForRootOptions): DynamicModule {
    const config = options?.config ?? { url: process.env.REDIS_URL ?? '' };
    console.log('[RedisService] Redis Client Config', config);

    const providers = {
      provide: 'Cache',
      useFactory: () => new RedisService(config),
    };

    return {
      global: true,
      module: CacheModule,
      providers: [providers],
      exports: [providers],
    };
  }
}
