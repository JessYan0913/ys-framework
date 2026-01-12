import { Test, TestingModule } from '@nestjs/testing';
import { Client } from 'minio';
import { MinioService } from './minio.service';

type MinioClientMock = {
  putObject: jest.Mock;
  presignedGetObject: jest.Mock;
  removeObject: jest.Mock;
};

const minioClientMock: MinioClientMock = {
  putObject: jest.fn().mockResolvedValue(undefined),
  presignedGetObject: jest.fn().mockResolvedValue('signed-url'),
  removeObject: jest.fn().mockResolvedValue(undefined),
};

jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => minioClientMock),
}));

describe('MinioService', () => {
  let service: MinioService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: MinioService,
          useFactory: () =>
            new MinioService({
              endPoint: '127.0.0.1',
              port: 9000,
              useSSL: false,
              accessKey: 'ak',
              secretKey: 'sk',
              bucket: 'bucket',
            }),
        },
      ],
    }).compile();

    service = module.get<MinioService>(MinioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create minio client with config', () => {
    expect(Client).toHaveBeenCalledWith({
      endPoint: '127.0.0.1',
      port: 9000,
      useSSL: false,
      accessKey: 'ak',
      secretKey: 'sk',
    });
  });

  it('putObject should call client.putObject and return object key', async () => {
    const key = await service.putObject({
      key: 'k1',
      data: Buffer.from('hello'),
      contentType: 'text/plain',
    });

    expect(key).toBe('k1');
    expect(minioClientMock.putObject).toHaveBeenCalledWith(
      'bucket',
      'k1',
      expect.any(Buffer),
      5,
      { 'Content-Type': 'text/plain' },
    );
  });

  it('getUrl should return public url when publicBaseUrl is set', async () => {
    const s = new MinioService({
      endPoint: '127.0.0.1',
      accessKey: 'ak',
      secretKey: 'sk',
      bucket: 'bucket',
      publicBaseUrl: 'https://cdn.example.com',
    });

    await expect(s.getUrl('k')).resolves.toBe('https://cdn.example.com/bucket/k');
  });

  it('getUrl should return presigned url when publicBaseUrl not set', async () => {
    await expect(service.getUrl('k')).resolves.toBe('signed-url');
    expect(minioClientMock.presignedGetObject).toHaveBeenCalledWith('bucket', 'k');
  });

  it('delete should call client.removeObject', async () => {
    await service.delete('k');
    expect(minioClientMock.removeObject).toHaveBeenCalledWith('bucket', 'k');
  });
});
