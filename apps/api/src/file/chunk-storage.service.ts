import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { existsSync } from 'fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

export interface ChunkInfo {
  partNumber: number;
  size: number;
  path: string;
}

@Injectable()
export class ChunkStorageService implements OnModuleDestroy {
  private readonly baseDir: string;

  constructor() {
    this.baseDir = join(tmpdir(), 'file-chunks');
    this.ensureBaseDir();
  }

  private async ensureBaseDir(): Promise<void> {
    if (!existsSync(this.baseDir)) {
      await mkdir(this.baseDir, { recursive: true });
    }
  }

  private getUploadDir(uploadId: string): string {
    return join(this.baseDir, uploadId);
  }

  private getChunkPath(uploadId: string, partNumber: number): string {
    return join(this.getUploadDir(uploadId), `part-${partNumber.toString().padStart(5, '0')}`);
  }

  async initUpload(uploadId: string): Promise<void> {
    const uploadDir = this.getUploadDir(uploadId);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
  }

  async saveChunk(uploadId: string, partNumber: number, data: Buffer): Promise<ChunkInfo> {
    await this.initUpload(uploadId);
    const chunkPath = this.getChunkPath(uploadId, partNumber);
    await writeFile(chunkPath, data);

    return {
      partNumber,
      size: data.length,
      path: chunkPath,
    };
  }

  async getChunk(uploadId: string, partNumber: number): Promise<Buffer | null> {
    const chunkPath = this.getChunkPath(uploadId, partNumber);
    if (!existsSync(chunkPath)) {
      return null;
    }
    return await readFile(chunkPath);
  }

  async listChunks(uploadId: string): Promise<ChunkInfo[]> {
    const uploadDir = this.getUploadDir(uploadId);
    if (!existsSync(uploadDir)) {
      return [];
    }

    const files = await readdir(uploadDir);
    const chunks: ChunkInfo[] = [];

    for (const file of files) {
      if (file.startsWith('part-')) {
        const partNumber = parseInt(file.replace('part-', ''), 10);
        const chunkPath = join(uploadDir, file);
        const data = await readFile(chunkPath);
        chunks.push({
          partNumber,
          size: data.length,
          path: chunkPath,
        });
      }
    }

    return chunks.sort((a, b) => a.partNumber - b.partNumber);
  }

  async mergeChunks(uploadId: string): Promise<Buffer> {
    const chunks = await this.listChunks(uploadId);
    const buffers: Buffer[] = [];

    for (const chunk of chunks) {
      const data = await readFile(chunk.path);
      buffers.push(data);
    }

    return Buffer.concat(buffers);
  }

  async cleanup(uploadId: string): Promise<void> {
    const uploadDir = this.getUploadDir(uploadId);
    if (existsSync(uploadDir)) {
      await rm(uploadDir, { recursive: true, force: true });
    }
  }

  async onModuleDestroy(): Promise<void> {
    // 清理所有临时文件（可选，取决于是否需要在重启后保留未完成的上传）
  }
}
