import { Cache } from '@lib/cache';
import { QueueService } from '@lib/queue';
import { Storage } from '@lib/storage';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { ChunkInfo, ChunkStorageService } from './chunk-storage.service';
import { FILE_JOB_NAMES, FILE_QUEUE_NAME } from './file.processor';

export interface UploadSession {
  uploadId: string;
  fileKey: string;
  filename: string;
  fileSize: number;
  contentType?: string;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: ChunkInfo[];
  createdAt: number;
}

export interface FileQueueConfig {
  enablePostProcess?: boolean;
  enableAsyncDelete?: boolean;
  attempts?: number;
  backoff?: 'exponential' | 'fixed';
  backoffDelay?: number;
}

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly UPLOAD_SESSION_TTL = 24 * 60 * 60; // 24小时
  private readonly DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
  private queueConfig: FileQueueConfig = {
    enablePostProcess: true,
    enableAsyncDelete: true,
    attempts: 3,
    backoff: 'exponential',
    backoffDelay: 1000,
  };

  constructor(
    @Inject('Storage') private readonly storage: Storage,
    @Inject('Cache') private readonly cache: Cache,
    private readonly chunkStorage: ChunkStorageService,
    @Optional() private readonly queueService?: QueueService,
  ) {}

  /**
   * 设置队列配置
   */
  setQueueConfig(config: FileQueueConfig): void {
    this.queueConfig = { ...this.queueConfig, ...config };
  }

  /**
   * 检查队列是否可用
   */
  isQueueEnabled(): boolean {
    return !!this.queueService;
  }

  async initiateUpload(params: {
    filename: string;
    fileSize: number;
    contentType?: string;
    chunkSize?: number;
  }): Promise<{
    uploadId: string;
    fileKey: string;
    chunkSize: number;
    totalChunks: number;
  }> {
    const chunkSize = params.chunkSize ?? this.DEFAULT_CHUNK_SIZE;
    const totalChunks = Math.ceil(params.fileSize / chunkSize);

    // 生成唯一的上传ID和文件Key
    const uploadId = randomUUID();
    const ext = params.filename.split('.').pop() || '';
    const fileKey = `${randomUUID()}${ext ? `.${ext}` : ''}`;

    // 初始化临时分片存储目录
    await this.chunkStorage.initUpload(uploadId);

    // 保存上传会话信息到缓存
    const session: UploadSession = {
      uploadId,
      fileKey,
      filename: params.filename,
      fileSize: params.fileSize,
      contentType: params.contentType,
      chunkSize,
      totalChunks,
      uploadedChunks: [],
      createdAt: Date.now(),
    };

    await this.cache.set(this.getSessionKey(uploadId), JSON.stringify(session), this.UPLOAD_SESSION_TTL);

    return {
      uploadId,
      fileKey,
      chunkSize,
      totalChunks,
    };
  }

  async uploadChunk(params: { uploadId: string; fileKey: string; partNumber: number; data: Buffer }): Promise<{
    partNumber: number;
    size: number;
  }> {
    // 获取上传会话
    const session = await this.getSession(params.uploadId);
    if (!session) {
      throw new NotFoundException('上传会话不存在或已过期');
    }

    if (session.fileKey !== params.fileKey) {
      throw new BadRequestException('文件Key不匹配');
    }

    if (params.partNumber < 1 || params.partNumber > session.totalChunks) {
      throw new BadRequestException(`分片编号无效，应在1到${session.totalChunks}之间`);
    }

    // 保存分片到临时存储
    const chunkInfo = await this.chunkStorage.saveChunk(params.uploadId, params.partNumber, params.data);

    // 更新会话中的已上传分片信息
    const existingIndex = session.uploadedChunks.findIndex((c) => c.partNumber === params.partNumber);
    if (existingIndex >= 0) {
      session.uploadedChunks[existingIndex] = chunkInfo;
    } else {
      session.uploadedChunks.push(chunkInfo);
    }

    await this.cache.set(this.getSessionKey(params.uploadId), JSON.stringify(session), this.UPLOAD_SESSION_TTL);

    return {
      partNumber: chunkInfo.partNumber,
      size: chunkInfo.size,
    };
  }

  async completeUpload(params: { uploadId: string; fileKey: string }): Promise<{
    fileKey: string;
    url: string;
  }> {
    // 获取上传会话
    const session = await this.getSession(params.uploadId);
    if (!session) {
      throw new NotFoundException('上传会话不存在或已过期');
    }

    if (session.fileKey !== params.fileKey) {
      throw new BadRequestException('文件Key不匹配');
    }

    // 检查是否所有分片都已上传
    if (session.uploadedChunks.length !== session.totalChunks) {
      throw new BadRequestException(
        `分片上传不完整，已上传 ${session.uploadedChunks.length}/${session.totalChunks} 个分片`,
      );
    }

    // 合并所有分片
    const mergedData = await this.chunkStorage.mergeChunks(params.uploadId);

    // 上传合并后的文件到存储服务
    await this.storage.upload(mergedData, {
      key: session.fileKey,
      filename: session.filename,
      contentType: session.contentType,
    });

    // 获取文件URL
    const url = await this.storage.getUrl(session.fileKey);

    // 清理临时分片和会话
    await this.chunkStorage.cleanup(params.uploadId);
    await this.cache.del(this.getSessionKey(params.uploadId));

    // 触发文件后处理任务
    await this.triggerPostProcess({
      fileKey: session.fileKey,
      filename: session.filename,
      contentType: session.contentType,
      fileSize: session.fileSize,
    });

    return {
      fileKey: session.fileKey,
      url,
    };
  }

  async abortUpload(params: { uploadId: string; fileKey: string }): Promise<void> {
    // 获取上传会话
    const session = await this.getSession(params.uploadId);
    if (!session) {
      throw new NotFoundException('上传会话不存在或已过期');
    }

    if (session.fileKey !== params.fileKey) {
      throw new BadRequestException('文件Key不匹配');
    }

    // 清理临时分片和会话
    await this.chunkStorage.cleanup(params.uploadId);
    await this.cache.del(this.getSessionKey(params.uploadId));
  }

  async getUploadProgress(uploadId: string): Promise<{
    uploadId: string;
    fileKey: string;
    filename: string;
    totalChunks: number;
    uploadedChunks: number;
    chunks: ChunkInfo[];
    progress: number;
  }> {
    const session = await this.getSession(uploadId);
    if (!session) {
      throw new NotFoundException('上传会话不存在或已过期');
    }

    const uploadedChunks = session.uploadedChunks.length;
    const progress = Math.round((uploadedChunks / session.totalChunks) * 100);

    return {
      uploadId: session.uploadId,
      fileKey: session.fileKey,
      filename: session.filename,
      totalChunks: session.totalChunks,
      uploadedChunks,
      chunks: session.uploadedChunks,
      progress,
    };
  }

  async getFileUrl(fileKey: string): Promise<string> {
    return await this.storage.getUrl(fileKey);
  }

  async downloadFile(fileKey: string): Promise<Buffer> {
    try {
      return await this.storage.getObject(fileKey);
    } catch {
      throw new NotFoundException('文件不存在');
    }
  }

  async getFileStream(fileKey: string): Promise<Readable> {
    try {
      return await this.storage.getObjectStream(fileKey);
    } catch {
      throw new NotFoundException('文件不存在');
    }
  }

  async deleteFile(fileKey: string): Promise<void> {
    try {
      await this.storage.delete(fileKey);
    } catch {
      throw new NotFoundException('文件不存在');
    }
  }

  /**
   * 异步删除文件（通过队列）
   */
  async deleteFileAsync(fileKey: string): Promise<void> {
    if (this.queueService && this.queueConfig.enableAsyncDelete) {
      const { attempts, backoff, backoffDelay } = this.queueConfig;
      await this.queueService.add(
        FILE_QUEUE_NAME,
        FILE_JOB_NAMES.DELETE_FILE,
        { fileKey },
        {
          attempts,
          backoff: { type: backoff, delay: backoffDelay },
        },
      );
      this.logger.log(`文件删除任务已加入队列: ${fileKey}`);
    } else {
      await this.deleteFile(fileKey);
    }
  }

  async simpleUpload(params: { filename: string; data: Buffer; contentType?: string }): Promise<{
    fileKey: string;
    url: string;
  }> {
    const ext = params.filename.split('.').pop() || '';
    const fileKey = `${randomUUID()}${ext ? `.${ext}` : ''}`;

    await this.storage.upload(params.data, {
      key: fileKey,
      filename: params.filename,
      contentType: params.contentType,
    });

    const url = await this.storage.getUrl(fileKey);

    // 触发文件后处理任务
    await this.triggerPostProcess({
      fileKey,
      filename: params.filename,
      contentType: params.contentType,
      fileSize: params.data.length,
    });

    return { fileKey, url };
  }

  /**
   * 触发文件后处理任务
   */
  private async triggerPostProcess(data: {
    fileKey: string;
    filename: string;
    contentType?: string;
    fileSize: number;
  }): Promise<void> {
    if (this.queueService && this.queueConfig.enablePostProcess) {
      try {
        const { attempts, backoff, backoffDelay } = this.queueConfig;
        await this.queueService.add(FILE_QUEUE_NAME, FILE_JOB_NAMES.POST_PROCESS, data, {
          attempts,
          backoff: { type: backoff, delay: backoffDelay },
        });
        this.logger.log(`文件后处理任务已加入队列: ${data.fileKey}`);
      } catch (error) {
        this.logger.error(`添加文件后处理任务失败: ${error.message}`);
      }
    }
  }

  /**
   * 调度清理过期上传任务
   */
  async scheduleCleanupExpired(expireTime?: number): Promise<void> {
    if (this.queueService) {
      const { attempts, backoff, backoffDelay } = this.queueConfig;
      await this.queueService.add(
        FILE_QUEUE_NAME,
        FILE_JOB_NAMES.CLEANUP_EXPIRED,
        {
          expireTime: expireTime ?? Date.now() - this.UPLOAD_SESSION_TTL * 1000,
          batchSize: 100,
        },
        {
          attempts,
          backoff: { type: backoff, delay: backoffDelay },
        },
      );
      this.logger.log('过期上传清理任务已加入队列');
    }
  }

  private getSessionKey(uploadId: string): string {
    return `upload:session:${uploadId}`;
  }

  private async getSession(uploadId: string): Promise<UploadSession | null> {
    const data = await this.cache.get<string>(this.getSessionKey(uploadId));
    if (!data) {
      return null;
    }
    return JSON.parse(data) as UploadSession;
  }
}
