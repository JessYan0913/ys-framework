import { Cache } from '@lib/cache';
import { QueueJob, QueueProcessor } from '@lib/queue';
import { Storage } from '@lib/storage';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ChunkStorageService } from './chunk-storage.service';

export const FILE_QUEUE_NAME = 'file';

export const FILE_JOB_NAMES = {
  POST_PROCESS: 'post-process',
  CLEANUP_EXPIRED: 'cleanup-expired',
  DELETE_FILE: 'delete-file',
  MERGE_CHUNKS: 'merge-chunks',
} as const;

export interface FilePostProcessJobData {
  fileKey: string;
  filename: string;
  contentType?: string;
  fileSize: number;
}

export interface CleanupExpiredJobData {
  expireTime: number;
  batchSize?: number;
}

export interface DeleteFileJobData {
  fileKey: string;
}

export interface MergeChunksJobData {
  uploadId: string;
  fileKey: string;
  filename: string;
  contentType?: string;
}

export type FileJobData = FilePostProcessJobData | CleanupExpiredJobData | DeleteFileJobData | MergeChunksJobData;

@Injectable()
export class FileProcessor implements QueueProcessor<FileJobData> {
  private readonly logger = new Logger(FileProcessor.name);
  private readonly UPLOAD_SESSION_TTL = 24 * 60 * 60;

  constructor(
    @Inject('Storage') private readonly storage: Storage,
    @Inject('Cache') private readonly cache: Cache,
    private readonly chunkStorage: ChunkStorageService,
  ) {}

  async process(job: QueueJob<FileJobData>): Promise<any> {
    switch (job.name) {
      case FILE_JOB_NAMES.POST_PROCESS:
        return this.handlePostProcess(job.data as FilePostProcessJobData);
      case FILE_JOB_NAMES.CLEANUP_EXPIRED:
        return this.handleCleanupExpired(job.data as CleanupExpiredJobData);
      case FILE_JOB_NAMES.DELETE_FILE:
        return this.handleDeleteFile(job.data as DeleteFileJobData);
      case FILE_JOB_NAMES.MERGE_CHUNKS:
        return this.handleMergeChunks(job.data as MergeChunksJobData);
      default:
        this.logger.warn(`未知的任务类型: ${job.name}`);
    }
  }

  /**
   * 文件后处理
   * 可扩展：生成缩略图、提取元数据、病毒扫描等
   */
  private async handlePostProcess(data: FilePostProcessJobData): Promise<void> {
    const { fileKey, filename, contentType, fileSize } = data;
    this.logger.log(`开始文件后处理: ${fileKey}, 文件名: ${filename}`);

    try {
      // 根据文件类型执行不同的后处理
      if (contentType?.startsWith('image/')) {
        await this.processImage(fileKey, contentType);
      } else if (contentType?.startsWith('video/')) {
        await this.processVideo(fileKey, contentType);
      } else if (contentType?.startsWith('audio/')) {
        await this.processAudio(fileKey, contentType);
      } else if (contentType === 'application/pdf') {
        await this.processPdf(fileKey);
      }

      // 记录文件元数据（可扩展：写入数据库）
      this.logger.log(`文件后处理完成: ${fileKey}, 大小: ${fileSize} bytes`);
    } catch (error) {
      this.logger.error(`文件后处理失败: ${fileKey}, 错误: ${error.message}`);
      throw error;
    }
  }

  /**
   * 清理过期的上传会话
   */
  private async handleCleanupExpired(data: CleanupExpiredJobData): Promise<{ cleaned: number }> {
    const { expireTime, batchSize: _batchSize = 100 } = data;
    this.logger.log(`开始清理过期上传，过期时间: ${new Date(expireTime).toISOString()}`);

    const cleanedCount = 0;

    try {
      // 扫描并清理过期的上传会话
      // 注意：这里需要根据实际的缓存实现来获取所有会话
      // 目前使用简单的方式，实际生产中可能需要使用 Redis SCAN 命令
      // TODO: 实现基于 Redis SCAN 的批量清理，使用 _batchSize 控制每批处理数量

      // 这里是一个示例实现，实际需要根据缓存接口扩展
      this.logger.log(`清理完成，共清理 ${cleanedCount} 个过期会话`);

      return { cleaned: cleanedCount };
    } catch (error) {
      this.logger.error(`清理过期上传失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 异步删除文件
   */
  private async handleDeleteFile(data: DeleteFileJobData): Promise<void> {
    const { fileKey } = data;
    this.logger.log(`开始异步删除文件: ${fileKey}`);

    try {
      await this.storage.delete(fileKey);
      this.logger.log(`文件删除成功: ${fileKey}`);
    } catch (error) {
      this.logger.error(`文件删除失败: ${fileKey}, 错误: ${error.message}`);
      throw error;
    }
  }

  /**
   * 异步合并分片
   */
  private async handleMergeChunks(data: MergeChunksJobData): Promise<{ fileKey: string; url: string }> {
    const { uploadId, fileKey, filename, contentType } = data;
    this.logger.log(`开始异步合并分片: ${uploadId}`);

    try {
      // 合并所有分片
      const mergedData = await this.chunkStorage.mergeChunks(uploadId);

      // 上传合并后的文件到存储服务
      await this.storage.upload(mergedData, {
        key: fileKey,
        filename,
        contentType,
      });

      // 获取文件URL
      const url = await this.storage.getUrl(fileKey);

      // 清理临时分片和会话
      await this.chunkStorage.cleanup(uploadId);
      await this.cache.del(`upload:session:${uploadId}`);

      this.logger.log(`分片合并完成: ${fileKey}`);

      return { fileKey, url };
    } catch (error) {
      this.logger.error(`分片合并失败: ${uploadId}, 错误: ${error.message}`);
      throw error;
    }
  }

  // 以下为可扩展的文件处理方法

  private async processImage(fileKey: string, contentType: string): Promise<void> {
    this.logger.log(`处理图片文件: ${fileKey}, 类型: ${contentType}`);
    // TODO: 生成缩略图、提取 EXIF 信息等
  }

  private async processVideo(fileKey: string, contentType: string): Promise<void> {
    this.logger.log(`处理视频文件: ${fileKey}, 类型: ${contentType}`);
    // TODO: 提取视频时长、生成预览图等
  }

  private async processAudio(fileKey: string, contentType: string): Promise<void> {
    this.logger.log(`处理音频文件: ${fileKey}, 类型: ${contentType}`);
    // TODO: 提取音频时长、波形图等
  }

  private async processPdf(fileKey: string): Promise<void> {
    this.logger.log(`处理PDF文件: ${fileKey}`);
    // TODO: 提取页数、生成预览图等
  }
}
