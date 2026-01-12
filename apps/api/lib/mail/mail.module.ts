import { DynamicModule, Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailConfig } from './interfaces/mail.interface';
import { MAIL_CONFIG, MAIL_PROVIDER } from './mail.constants';
import { SmtpMailProvider } from './providers/smtp-mail.provider';

@Global()
@Module({})
export class MailModule {
  static forRoot(config: MailConfig): DynamicModule {
    const configProvider = {
      provide: MAIL_CONFIG,
      useValue: config,
    };

    return {
      global: true,
      module: MailModule,
      providers: [
        configProvider,
        SmtpMailProvider,
        {
          provide: MAIL_PROVIDER,
          useExisting: SmtpMailProvider,
        },
        MailService,
      ],
      exports: [configProvider, SmtpMailProvider, MAIL_PROVIDER, MailService],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<MailConfig> | MailConfig;
    inject?: any[];
  }): DynamicModule {
    const configProvider = {
      provide: MAIL_CONFIG,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    return {
      global: true,
      module: MailModule,
      providers: [
        configProvider,
        SmtpMailProvider,
        {
          provide: MAIL_PROVIDER,
          useExisting: SmtpMailProvider,
        },
        MailService,
      ],
      exports: [configProvider, SmtpMailProvider, MAIL_PROVIDER, MailService],
    };
  }
}