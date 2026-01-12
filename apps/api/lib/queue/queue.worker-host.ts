import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import { QueueJob, QueueProcessor } from './queue.processor';
import { QueueService } from './queue.service';

export type QueueWorkerHostOptions = {
  queueName: string;
  concurrency?: number;
};

export class QueueWorkerHost implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker;

  constructor(
    private readonly queueService: QueueService,
    private readonly processor: QueueProcessor,
    private readonly options: QueueWorkerHostOptions,
  ) {}

  onModuleInit() {
    const { connection, prefix } = this.queueService.getOptions();

    this.worker = new Worker(
      this.options.queueName,
      async (job) =>
        await this.processor.process({ name: job.name, data: job.data } satisfies QueueJob),
      {
        connection,
        prefix,
        concurrency: this.options.concurrency,
      },
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
