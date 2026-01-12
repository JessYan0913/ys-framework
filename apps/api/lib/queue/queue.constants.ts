export type RegisterQueueOptions = {
  name: string;
};

export const getQueueToken = (name: string) => `QUEUE:${name}`;

export const getWorkerToken = (queueName: string, processorName: string) =>
  `QUEUE_WORKER:${queueName}:${processorName}`;
