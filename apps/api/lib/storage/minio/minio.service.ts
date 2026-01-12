import { Injectable } from '@nestjs/common';
import { Client } from 'minio';
import { Storage } from '../interfaces/storage.interface';

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

  async putObject(params: { key?: string; filename?: string; data: Buffer; contentType?: string }): Promise<string> {
    const objectName = params.key ?? `${Date.now()}-${params.filename ?? 'file'}`;

    await this.client.putObject(
      this.config.bucket,
      objectName,
      params.data,
      params.data.length,
      params.contentType ? { 'Content-Type': params.contentType } : undefined,
    );

    return objectName;
  }

  async getUrl(fileKey: string): Promise<string> {
    if (this.config.publicBaseUrl) {
      return `${this.config.publicBaseUrl}/${this.config.bucket}/${fileKey}`;
    }

    return await this.client.presignedGetObject(this.config.bucket, fileKey);
  }

  async delete(fileKey: string): Promise<void> {
    await this.client.removeObject(this.config.bucket, fileKey);
  }
}
