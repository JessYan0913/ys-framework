import { QueueModule, QueueService } from '@lib/queue';
import { DynamicModule, Module } from '@nestjs/common';
import { ChunkStorageService } from './chunk-storage.service';
import { FileController } from './file.controller';
import { FILE_QUEUE_NAME, FileProcessor } from './file.processor';
import { FileQueueConfig, FileService } from './file.service';

export interface FileModuleOptions {
  enableQueue?: boolean;
  queueConfig?: FileQueueConfig;
}

@Module({})
export class FileModule {
  static forRoot(options: FileModuleOptions = {}): DynamicModule {
    const { enableQueue = false, queueConfig } = options;

    const imports: DynamicModule[] = [];
    const providers: any[] = [ChunkStorageService];

    if (enableQueue) {
      imports.push(
        QueueModule.registerQueue({ name: FILE_QUEUE_NAME }),
        QueueModule.registerProcessor({
          queueName: FILE_QUEUE_NAME,
          processor: FileProcessor,
          concurrency: 5,
        }),
      );

      providers.push(FileProcessor);
      providers.push({
        provide: FileService,
        useFactory: (storage: any, cache: any, chunkStorage: ChunkStorageService, queueService: QueueService) => {
          const service = new FileService(storage, cache, chunkStorage, queueService);
          if (queueConfig) {
            service.setQueueConfig(queueConfig);
          }
          return service;
        },
        inject: ['Storage', 'Cache', ChunkStorageService, QueueService],
      });
    } else {
      providers.push(FileService);
    }

    return {
      module: FileModule,
      imports,
      controllers: [FileController],
      providers,
      exports: [FileService],
    };
  }
}
