import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [RedisService],
    }).compile();
    service = module.get<RedisService>(RedisService);
    await service.onModuleInit();
  });

  afterAll(async () => {
    await service.onModuleDestroy();
  });

  it('set and get a value', async () => {
    await service.set('test:key', 'hello');
    const val = await service.get('test:key');
    expect(val).toBe('hello');
    await service.del('test:key');
  });

  it('set with TTL — key expires', async () => {
    await service.set('test:ttl', 'bye', 1);
    await new Promise((r) => setTimeout(r, 1100));
    const val = await service.get('test:ttl');
    expect(val).toBeNull();
  });

  it('exists returns true / false', async () => {
    await service.set('test:exists', '1');
    expect(await service.exists('test:exists')).toBe(true);
    await service.del('test:exists');
    expect(await service.exists('test:exists')).toBe(false);
  });
});
