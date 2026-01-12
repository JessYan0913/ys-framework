import { DynamicModule, Global, Module, Type } from '@nestjs/common';
import { Queue } from 'bullmq';
import { getQueueToken, getWorkerToken, RegisterQueueOptions } from './queue.constants';
import { QueueProcessor } from './queue.processor';
import { QueueService, QueueModuleOptions } from './queue.service';
import { QueueWorkerHost } from './queue.worker-host';

export type RegisterProcessorOptions = {
  queueName: string;
  processor: Type<QueueProcessor>;
  concurrency?: number;
};

@Global()
@Module({})
export class QueueModule {
  static forRoot(options: QueueModuleOptions): DynamicModule {
    const providers = {
      provide: QueueService,
      useFactory: () => new QueueService(options),
    };

    return {
      global: true,
      module: QueueModule,
      providers: [providers],
      exports: [providers],
    };
  }

  static registerQueue(options: RegisterQueueOptions): DynamicModule {
    const providers = {
      provide: getQueueToken(options.name),
      useFactory: (queueService: QueueService): Queue => queueService.getQueue(options.name),
      inject: [QueueService],
    };

    return {
      module: QueueModule,
      providers: [providers],
      exports: [providers],
    };
  }

  static registerProcessor(options: RegisterProcessorOptions): DynamicModule {
    const workerToken = getWorkerToken(options.queueName, options.processor.name);

    const workerProvider = {
      provide: workerToken,
      useFactory: (queueService: QueueService, processor: QueueProcessor) =>
        new QueueWorkerHost(queueService, processor, {
          queueName: options.queueName,
          concurrency: options.concurrency,
        }),
      inject: [QueueService, options.processor],
    };

    return {
      module: QueueModule,
      providers: [options.processor, workerProvider],
      exports: [options.processor],
    };
  }
}
