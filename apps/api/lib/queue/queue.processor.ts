export type QueueJob<TData = unknown> = {
  name: string;
  data: TData;
};

export interface QueueProcessor<TData = unknown, TResult = unknown> {
  process(job: QueueJob<TData>): Promise<TResult> | TResult;
}
