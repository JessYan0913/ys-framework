import { DynamicModule, Global, Module } from '@nestjs/common';
import { QueueModule, QueueService } from '../queue';
import { MailConfig } from './interfaces/mail.interface';
import { MAIL_CONFIG, MAIL_PROVIDER } from './mail.constants';
import { MAIL_QUEUE_NAME, MailProcessor } from './mail.processor';
import { MailQueueConfig, MailService } from './mail.service';
import { SmtpMailProvider } from './providers/smtp-mail.provider';

export interface MailModuleOptions extends MailConfig {
  enableQueue?: boolean;
  queueConfig?: MailQueueConfig;
}

@Global()
@Module({})
export class MailModule {
  static forRoot(config: MailConfig): DynamicModule;
  static forRoot(config: MailModuleOptions): DynamicModule;
  static forRoot(config: MailConfig | MailModuleOptions): DynamicModule {
    const options = config as MailModuleOptions;
    const enableQueue = options.enableQueue ?? false;
    const queueConfig = options.queueConfig;

    const configProvider = {
      provide: MAIL_CONFIG,
      useValue: config,
    };

    const imports: DynamicModule[] = [];
    const providers: any[] = [
      configProvider,
      SmtpMailProvider,
      {
        provide: MAIL_PROVIDER,
        useExisting: SmtpMailProvider,
      },
    ];

    if (enableQueue) {
      imports.push(
        QueueModule.registerQueue({ name: MAIL_QUEUE_NAME }),
        QueueModule.registerProcessor({
          queueName: MAIL_QUEUE_NAME,
          processor: MailProcessor,
          concurrency: queueConfig?.attempts || 5,
        }),
      );

      providers.push(MailProcessor);
      providers.push({
        provide: MailService,
        useFactory: (mailConfig: MailConfig, provider: any, queueService: QueueService) => {
          const service = new MailService(mailConfig, provider);
          service.setQueueService(queueService, queueConfig);
          return service;
        },
        inject: [MAIL_CONFIG, MAIL_PROVIDER, QueueService],
      });
    } else {
      providers.push(MailService);
    }

    return {
      global: true,
      module: MailModule,
      imports,
      providers,
      exports: [configProvider, SmtpMailProvider, MAIL_PROVIDER, MailService],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<MailModuleOptions> | MailModuleOptions;
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
        {
          provide: MailService,
          useFactory: (mailConfig: MailModuleOptions, provider: any, queueService?: QueueService) => {
            const service = new MailService(mailConfig, provider);
            if (mailConfig.enableQueue && queueService) {
              service.setQueueService(queueService, mailConfig.queueConfig);
            }
            return service;
          },
          inject: [MAIL_CONFIG, MAIL_PROVIDER, { token: QueueService, optional: true }],
        },
      ],
      exports: [configProvider, SmtpMailProvider, MAIL_PROVIDER, MailService],
    };
  }
}
