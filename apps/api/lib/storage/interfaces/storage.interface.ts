export interface Storage {
  putObject(params: {
    key?: string;
    filename?: string;
    data: Buffer;
    contentType?: string;
  }): Promise<string>;
  getUrl(fileKey: string): Promise<string>;
  delete(fileKey: string): Promise<void>;
}
