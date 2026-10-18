import express from 'express';
import request from 'supertest';
import {
  cacheMiddleware,
  generateETag,
  invalidateCachePattern,
} from '../src/middleware/cache.middleware';
import { createRateLimiter } from '../src/middleware/rate-limit.middleware';
import * as redisModule from '../src/redis';

jest.mock('../src/redis');

describe('Cache Middleware & Rate Limiting', () => {
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      keys: jest.fn().mockResolvedValue([]),
      del: jest.fn().mockResolvedValue(1),
      call: jest.fn().mockResolvedValue([1, 100]),
    };

    (redisModule.getRedisClient as jest.Mock).mockReturnValue(mockRedis);
  });

  describe('generateETag', () => {
    it('should generate consistent W/"<hash>" format', () => {
      const etag1 = generateETag('test payload');
      const etag2 = generateETag('test payload');
      expect(etag1).toBe(etag2);
      expect(etag1).toMatch(/^W\/"[a-f0-9]{32}"$/);
    });
  });

  describe('cacheMiddleware', () => {
    it('should return MISS on first call and store in Redis', async () => {
      const app = express();
      app.use(cacheMiddleware(60, 'test'));
      app.get('/test', (_req, res) => res.json({ msg: 'hello' }));

      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
      expect(res.headers['x-cache']).toBe('MISS');
      expect(res.headers['etag']).toBeDefined();
      expect(mockRedis.set).toHaveBeenCalledWith(
        'cache:test:/test',
        expect.stringContaining('hello'),
        'EX',
        60
      );
    });

    it('should return HIT with cached response if key is in Redis', async () => {
      const cachedBody = JSON.stringify({ msg: 'cached hello' });
      const cachedEtag = generateETag(cachedBody);
      mockRedis.get.mockResolvedValue(
        JSON.stringify({ body: cachedBody, etag: cachedEtag })
      );

      const app = express();
      app.use(cacheMiddleware(60, 'test'));
      app.get('/test', (_req, res) => res.json({ msg: 'fresh' }));

      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
      expect(res.headers['x-cache']).toBe('HIT');
      expect(res.body.msg).toBe('cached hello');
    });

    it('should return 304 Not Modified when If-None-Match matches ETag', async () => {
      const cachedBody = JSON.stringify({ msg: 'cached hello' });
      const cachedEtag = generateETag(cachedBody);
      mockRedis.get.mockResolvedValue(
        JSON.stringify({ body: cachedBody, etag: cachedEtag })
      );

      const app = express();
      app.use(cacheMiddleware(60, 'test'));
      app.get('/test', (_req, res) => res.json({ msg: 'fresh' }));

      const res = await request(app)
        .get('/test')
        .set('If-None-Match', cachedEtag);

      expect(res.status).toBe(304);
      expect(res.headers['etag']).toBe(cachedEtag);
    });
  });

  describe('invalidateCachePattern', () => {
    it('should delete keys found matching the pattern', async () => {
      mockRedis.keys.mockResolvedValue(['cache:events:1', 'cache:events:2']);

      const count = await invalidateCachePattern('cache:events:*', mockRedis);
      expect(mockRedis.keys).toHaveBeenCalledWith('cache:events:*');
      expect(mockRedis.del).toHaveBeenCalledWith('cache:events:1', 'cache:events:2');
      expect(count).toBe(2);
    });

    it('should return 0 when no keys match', async () => {
      mockRedis.keys.mockResolvedValue([]);
      const count = await invalidateCachePattern('cache:events:*', mockRedis);
      expect(count).toBe(0);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('createRateLimiter', () => {
    it('should block requests when limit is exceeded', async () => {
      const app = express();
      // Configure low limit of 2 requests for testing
      app.use(createRateLimiter({ max: 2, windowMs: 1000 }));
      app.get('/limited', (_req, res) => res.json({ ok: true }));

      const res1 = await request(app).get('/limited');
      expect(res1.status).toBe(200);

      const res2 = await request(app).get('/limited');
      expect(res2.status).toBe(200);

      const res3 = await request(app).get('/limited');
      expect(res3.status).toBe(429);
      expect(res3.body.success).toBe(false);
      expect(res3.body.error).toContain('Too many requests');
    });
  });
});
