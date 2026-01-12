import { Injectable } from '@nestjs/common';
import { Client } from 'minio';
import { Readable } from 'stream';
import { Storage, UploadOptions, UploadResult } from '../interfaces/storage.interface';

@Injectable()
export class MinioService implements Storage {
  private readonly client: Client;

  constructor(
    private readonly config: {
      endPoint: string;
      port?: number;
      useSSL?: boolean;
      accessKey: string;
      secretKey: string;
      bucket: string;
      publicBaseUrl?: string;
    },
  ) {
    this.client = new Client({
      endPoint: this.config.endPoint,
      port: this.config.port,
      useSSL: this.config.useSSL,
      accessKey: this.config.accessKey,
      secretKey: this.config.secretKey,
    });
  }

  async upload(data: Buffer | Readable, options?: UploadOptions): Promise<UploadResult> {
    const key = options?.key ?? `${Date.now()}-${options?.filename ?? 'file'}`;
    const metadata = options?.contentType ? { 'Content-Type': options.contentType } : undefined;

    if (Buffer.isBuffer(data)) {
      await this.client.putObject(this.config.bucket, key, data, data.length, metadata);
    } else {
      await this.client.putObject(this.config.bucket, key, data, undefined, metadata);
    }

    return { key, size: Buffer.isBuffer(data) ? data.length : undefined };
  }

  async getUrl(key: string, expiresIn?: number): Promise<string> {
    if (this.config.publicBaseUrl) {
      return `${this.config.publicBaseUrl}/${this.config.bucket}/${key}`;
    }
    return await this.client.presignedGetObject(this.config.bucket, key, expiresIn ?? 7 * 24 * 60 * 60);
  }

  async getObject(key: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.config.bucket, key);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async getObjectStream(key: string): Promise<Readable> {
    return await this.client.getObject(this.config.bucket, key);
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.config.bucket, key);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.statObject(this.config.bucket, key);
      return true;
    } catch {
      return false;
    }
  }
}
