import { DynamicModule, Global, Module } from '@nestjs/common';
import { MailConfig, MailModule, MailService } from '../mail';
import { EmailCaptchaService } from './email-captcha.service';
import { EmailCaptchaConfig } from './types';

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
    };

    const imports = [];

    // 邮件模块
    if (options.enableMail) {
      if (!options.mailConfig) {
        throw new Error('mailConfig must be provided when enableMail is true');
      }
      imports.push(MailModule.forRoot(options.mailConfig));
    }

    return {
      global: true,
      module: EmailCaptchaModule,
      imports,
      providers: [
        {
          provide: EmailCaptchaService,
          useFactory: (mailService?: MailService) => {
            return new EmailCaptchaService(emailCaptchaConfig, options.enableMail ? mailService : undefined);
          },
          inject: options.enableMail ? [MailService] : [],
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
          useFactory: async (mailService: MailService, ...args: any[]) => {
            const emailCaptchaOptions = await options.useFactory(...args);
            const emailCaptchaConfig: EmailCaptchaConfig = {
              storage: emailCaptchaOptions.storage,
              codeLength: emailCaptchaOptions.codeLength || 6,
              ttl: emailCaptchaOptions.ttl || 300,
              secret: emailCaptchaOptions.secret || 'default-secret-change-in-production',
            };

            return new EmailCaptchaService(
              emailCaptchaConfig,
              emailCaptchaOptions.enableMail !== false ? mailService : undefined,
            );
          },
          inject: [MailService, ...(options.inject || [])],
        },
      ],
      exports: [EmailCaptchaService],
    };
  }
}
