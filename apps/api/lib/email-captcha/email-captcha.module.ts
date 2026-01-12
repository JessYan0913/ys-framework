import { DynamicModule, Global, Module } from '@nestjs/common';
import { MailConfig, MailModule, MailService } from '../mail';
import { QueueModule, QueueService } from '../queue';
import { EMAIL_CAPTCHA_QUEUE_NAME, EmailCaptchaProcessor } from './email-captcha.processor';
import { EmailCaptchaService } from './email-captcha.service';
import { EmailCaptchaConfig, QueueConfig } from './types';

export interface EmailCaptchaModuleOptions {
  storage: {
    set(key: string, value: string, ttl: number): Promise<void>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<void>;
  };
  codeLength?: number;
  ttl?: number;
  secret?: string;
  enableMail?: boolean;
  mailConfig?: MailConfig;
  enableQueue?: boolean;
  queueConfig?: QueueConfig;
}

@Global()
@Module({})
export class EmailCaptchaModule {
  static forRoot(options: EmailCaptchaModuleOptions): DynamicModule {
    const emailCaptchaConfig: EmailCaptchaConfig = {
      storage: options.storage,
      codeLength: options.codeLength || 6,
      ttl: options.ttl || 300,
      secret: options.secret || 'default-secret-change-in-production',
      queueConfig: options.queueConfig,
    };

    const imports = [];
    const providers = [];
    const injectTokens: any[] = [];

    // 邮件模块
    if (options.enableMail) {
      if (!options.mailConfig) {
        throw new Error('mailConfig must be provided when enableMail is true');
      }
      imports.push(MailModule.forRoot(options.mailConfig));
      injectTokens.push(MailService);
    }

    // 队列模块（注册队列和处理器）
    if (options.enableQueue) {
      imports.push(
        QueueModule.registerQueue({ name: EMAIL_CAPTCHA_QUEUE_NAME }),
        QueueModule.registerProcessor({
          queueName: EMAIL_CAPTCHA_QUEUE_NAME,
          processor: EmailCaptchaProcessor,
          concurrency: options.queueConfig?.concurrency || 5,
        }),
      );
      injectTokens.push(QueueService);
    }

    return {
      global: true,
      module: EmailCaptchaModule,
      imports,
      providers: [
        ...providers,
        {
          provide: EmailCaptchaService,
          useFactory: (...services: any[]) => {
            let mailService: MailService | undefined;
            let queueService: QueueService | undefined;

            let idx = 0;
            if (options.enableMail) {
              mailService = services[idx++];
            }
            if (options.enableQueue) {
              queueService = services[idx++];
            }

            return new EmailCaptchaService(emailCaptchaConfig, mailService, queueService);
          },
          inject: injectTokens,
        },
      ],
      exports: [EmailCaptchaService],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<EmailCaptchaModuleOptions> | EmailCaptchaModuleOptions;
    inject?: any[];
    imports?: any[];
  }): DynamicModule {
    return {
      global: true,
      module: EmailCaptchaModule,
      imports: options.imports || [],
      providers: [
        {
          provide: EmailCaptchaService,
          useFactory: async (mailService: MailService, queueService: QueueService, ...args: any[]) => {
            const emailCaptchaOptions = await options.useFactory(...args);
            const emailCaptchaConfig: EmailCaptchaConfig = {
              storage: emailCaptchaOptions.storage,
              codeLength: emailCaptchaOptions.codeLength || 6,
              ttl: emailCaptchaOptions.ttl || 300,
              secret: emailCaptchaOptions.secret || 'default-secret-change-in-production',
              queueConfig: emailCaptchaOptions.queueConfig,
            };

            return new EmailCaptchaService(
              emailCaptchaConfig,
              emailCaptchaOptions.enableMail !== false ? mailService : undefined,
              emailCaptchaOptions.enableQueue ? queueService : undefined,
            );
          },
          inject: [MailService, QueueService, ...(options.inject || [])],
        },
      ],
      exports: [EmailCaptchaService],
    };
  }
}
