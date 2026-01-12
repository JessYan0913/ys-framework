import { AuthModule } from '@lib/auth';
import { Cache, CacheModule } from '@lib/cache';
import { RateLimitInterceptor } from '@lib/common';
import { EmailCaptchaModule } from '@lib/email-captcha';
import { ImageCaptchaModule, LocalImageLoader } from '@lib/image-captcha';
import { MailModule } from '@lib/mail';
import { QueueModule } from '@lib/queue';
import { StorageModule } from '@lib/storage';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DrizzleModule } from '@ys/database/nestjs';
import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';
import { AuthModule as LocalAuthModule } from './auth/auth.module';
import { CaptchaModule } from './captcha/captcha.module';
import { FileModule } from './file/file.module';
import { OidcModule } from './oidc/oidc.module';
import { UserModule } from './user/user.module';
import { UserService } from './user/user.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(process.cwd(), '..', '..', '.env'), '.env'],
    }),
    LoggerModule.forRootAsync({
      useFactory: () => {
        const isProduction = process.env.NODE_ENV === 'production';
        return {
          pinoHttp: {
            transport: isProduction
              ? {
                  target: 'pino-roll',
                  options: {
                    file: join('logs', 'auth-server'),
                    frequency: 'daily',
                    mkdir: true,
                    dateFormat: 'yyyy-MM-dd-hh',
                  },
                }
              : {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname',
                    colorize: true,
                    messageFormat: '{msg}',
                    encoding: 'utf-8',
                    timestampKey: 'time',
                  },
                },
            level: isProduction ? 'info' : 'debug',
          },
        };
      },
    }),
    CacheModule.forRoot({
      config: {
        url: process.env.REDIS_URL ?? '',
      },
    }),
    QueueModule.forRoot({
      connection: {
        url: process.env.REDIS_URL ?? '',
      },
      prefix: process.env.QUEUE_PREFIX || 'ys:queue',
    }),
    MailModule.forRoot({
      host: process.env.MAIL_HOST || 'localhost',
      port: parseInt(process.env.MAIL_PORT || '587'),
      secure: process.env.MAIL_SECURE === 'true',
      auth: {
        user: process.env.MAIL_USER || '',
        pass: process.env.MAIL_PASS || '',
      },
      from: process.env.MAIL_FROM || 'noreply@example.com',
    }),
    ImageCaptchaModule.forRootAsync({
      useFactory: (cache: Cache) => ({
        storage: {
          set: async (key: string, value: string, ttl: number) => {
            await cache.set(key, value, ttl);
          },
          get: async (key: string): Promise<string | null> => {
            return await cache.get<string>(key);
          },
          del: async (key: string) => {
            await cache.del(key);
          },
        },
        imageLoader: new LocalImageLoader(join(process.cwd(), 'assets', 'captcha-images')),
        defaultSize: { width: 300, height: 200 },
        ttl: 300,
        secret: process.env.CAPTCHA_SECRET || 'default-secret',
      }),
      inject: ['Cache'],
    }),
    EmailCaptchaModule.forRootAsync({
      useFactory: (cache: Cache) => ({
        storage: {
          set: async (key: string, value: string, ttl: number) => {
            await cache.set(key, value, ttl);
          },
          get: async (key: string): Promise<string | null> => {
            return await cache.get<string>(key);
          },
          del: async (key: string) => {
            await cache.del(key);
          },
        },
        enableMail: true,
        enableQueue: process.env.ENABLE_EMAIL_QUEUE === 'true',
        queueConfig: {
          concurrency: parseInt(process.env.EMAIL_QUEUE_CONCURRENCY || '5'),
          attempts: parseInt(process.env.EMAIL_QUEUE_ATTEMPTS || '3'),
          backoff: (process.env.EMAIL_QUEUE_BACKOFF as 'exponential' | 'fixed') || 'exponential',
          backoffDelay: parseInt(process.env.EMAIL_QUEUE_BACKOFF_DELAY || '1000'),
        },
        ttl: 300,
        secret: process.env.EMAIL_CAPTCHA_SECRET || 'default-secret',
      }),
      inject: ['Cache'],
    }),
    AuthModule.forRoot({
      userService: UserService,
      enableJwtGuard: process.env.ENABLE_JWT_GUARD !== 'false',
      enableResourceGuard: process.env.ENABLE_RESOURCE_GUARD !== 'false',
      jwt: {
        secret: process.env.JWT_SECRET || 'fallback-secret',
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '1h' },
      },
      tokenRevocation: {
        enabled: true,
      },
      oauth: {
        feishu: {
          clientId: process.env.FEISHU_APP_ID ?? '',
          clientSecret: process.env.FEISHU_APP_SECRET ?? '',
          appId: process.env.FEISHU_APP_ID ?? '',
          appSecret: process.env.FEISHU_APP_SECRET ?? '',
          redirectUri: process.env.FEISHU_REDIRECT_URI ?? '',
        },
      },
    }),
    DrizzleModule,
    UserModule,
    OidcModule,
    CaptchaModule,
    LocalAuthModule,
    StorageModule.forRoot(),
    FileModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitInterceptor,
    },
  ],
})
export class AppModule {}
