import { DynamicModule, Global, Module } from '@nestjs/common';
import { MinioService } from './minio/minio.service';

type MinioConfig = {
  endPoint: string;
  port?: number;
  useSSL?: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
  publicBaseUrl?: string;
};

export type ForRootOptions = {
  config?: MinioConfig;
};

@Global()
@Module({})
export class StorageModule {
  static forRoot(options?: ForRootOptions): DynamicModule {
    const config: MinioConfig =
      options?.config ??
      ({
        endPoint: process.env.MINIO_ENDPOINT ?? '',
        port: process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT) : undefined,
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY ?? '',
        secretKey: process.env.MINIO_SECRET_KEY ?? '',
        bucket: process.env.MINIO_BUCKET ?? '',
        publicBaseUrl: process.env.MINIO_PUBLIC_BASE_URL ?? undefined,
      } satisfies MinioConfig);

    const providers = {
      provide: 'Storage',
      useFactory: () => new MinioService(config),
    };
    return {
      global: true,
      module: StorageModule,
      providers: [providers],
      exports: [providers],
    };
  }
}
