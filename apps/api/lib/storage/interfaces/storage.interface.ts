import { Readable } from 'stream';

export interface UploadResult {
  key: string;
  url?: string;
  size?: number;
}

export interface UploadOptions {
  key?: string;
  filename?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface Storage {
  upload(data: Buffer | Readable, options?: UploadOptions): Promise<UploadResult>;

  getUrl(key: string, expiresIn?: number): Promise<string>;

  getObject(key: string): Promise<Buffer>;

  getObjectStream(key: string): Promise<Readable>;

  delete(key: string): Promise<void>;

  exists(key: string): Promise<boolean>;
}
