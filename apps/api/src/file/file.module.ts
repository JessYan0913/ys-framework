import { Module } from '@nestjs/common';
import { ChunkStorageService } from './chunk-storage.service';
import { FileController } from './file.controller';
import { FileService } from './file.service';

@Module({
  controllers: [FileController],
  providers: [FileService, ChunkStorageService],
  exports: [FileService],
})
export class FileModule {}
