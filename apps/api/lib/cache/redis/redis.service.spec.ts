import { Test, TestingModule } from '@nestjs/testing';
import { createClient } from 'redis';
import { RedisService } from './redis.service';

type RedisClientMock = {
  on: jest.Mock;
  connect: jest.Mock;
  quit: jest.Mock;
  set: jest.Mock;
  get: jest.Mock;
  del: jest.Mock;
  exists: jest.Mock;
};

jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

describe('RedisService', () => {
  let service: RedisService;
  let client: RedisClientMock;

  beforeEach(async () => {
    client = {
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue(0),
    };

    (createClient as unknown as jest.Mock).mockReturnValue(client);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: RedisService,
          useFactory: () => new RedisService({ url: 'redis://localhost:6379' }),
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should connect on construct', () => {
    expect(createClient).toHaveBeenCalledWith({ url: 'redis://localhost:6379' });
    expect(client.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(client.connect).toHaveBeenCalled();
  });

  it('set should JSON.stringify and use ttl when provided', async () => {
    await service.set('k', { a: 1 }, 60);
    expect(client.set).toHaveBeenCalledWith('k', JSON.stringify({ a: 1 }), { EX: 60 });
  });

  it('get should JSON.parse when possible', async () => {
    client.get.mockResolvedValueOnce('{"a":1}');
    await expect(service.get<{ a: number }>('k')).resolves.toEqual({ a: 1 });
  });

  it('get should return raw string when not json', async () => {
    client.get.mockResolvedValueOnce('not-json');
    await expect(service.get<string>('k')).resolves.toBe('not-json');
  });

  it('del should delegate to client.del', async () => {
    await service.del('k');
    expect(client.del).toHaveBeenCalledWith('k');
  });

  it('exists should return boolean', async () => {
    client.exists.mockResolvedValueOnce(1);
    await expect(service.exists('k')).resolves.toBe(true);
  });

  it('onModuleDestroy should quit', async () => {
    await service.onModuleDestroy();
    expect(client.quit).toHaveBeenCalled();
  });
});
