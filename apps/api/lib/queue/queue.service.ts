import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue, JobsOptions, ConnectionOptions } from 'bullmq';

export type QueueModuleOptions = {
  connection: ConnectionOptions;
  prefix?: string;
};

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly queues = new Map<string, Queue>();

  constructor(private readonly options: QueueModuleOptions) {}

  getOptions(): QueueModuleOptions {
    return this.options;
  }

  getQueue(name: string): Queue {
    const existing = this.queues.get(name);
    if (existing) {
      return existing;
    }

    const queue = new Queue(name, {
      connection: this.options.connection,
      prefix: this.options.prefix,
    });

    this.queues.set(name, queue);
    return queue;
  }

  async add<T = any>(queueName: string, jobName: string, data: T, opts?: JobsOptions) {
    return await this.getQueue(queueName).add(jobName, data, opts);
  }

  async onModuleDestroy() {
    await Promise.all(Array.from(this.queues.values()).map((q) => q.close()));
    this.queues.clear();
  }
}
