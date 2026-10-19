import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import Redis from 'ioredis';
import { getRedisClient, getRedisSubscriber } from '../redis';

export function generateETag(body: string): string {
  return `W/"${crypto.createHash('md5').update(body).digest('hex')}"`;
}

export function cacheMiddleware(ttlSeconds: number, cacheKeyPrefix = 'api') {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    let redis: Redis;
    try {
      redis = getRedisClient();
    } catch {
      return next();
    }

    const cacheKey = `cache:${cacheKeyPrefix}:${req.originalUrl}`;

    try {
      const cached = await redis.get(cacheKey);

      if (cached) {
        const parsed = JSON.parse(cached);
        const etag = parsed.etag || generateETag(cached);

        // Check conditional ETag request (If-None-Match)
        if (req.headers['if-none-match'] === etag) {
          res.setHeader('ETag', etag);
          res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}`);
          res.setHeader('X-Cache', 'HIT');
          return res.status(304).end();
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}`);
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).send(parsed.body);
      }

      res.setHeader('X-Cache', 'MISS');

      // Intercept res.json / res.send to cache response
      const originalSend = res.send.bind(res);
      res.send = (body: any): Response => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const stringBody = typeof body === 'string' ? body : JSON.stringify(body);
          const etag = generateETag(stringBody);

          res.setHeader('ETag', etag);
          res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}`);

          // Async save to Redis without blocking client response
          redis
            .set(cacheKey, JSON.stringify({ body: stringBody, etag }), 'EX', ttlSeconds)
            .catch((err) => {
              console.error(`[Cache Error] Failed to store ${cacheKey}:`, err.message);
            });
        }

        return originalSend(body);
      };

      next();
    } catch (err: any) {
      console.error('[Cache Middleware Error]', err.message);
      next();
    }
  };
}

/**
 * Invalidate Redis cache keys matching a pattern (e.g. "cache:events:*")
 */
export async function invalidateCachePattern(
  pattern: string,
  redis: Redis = getRedisClient()
): Promise<number> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[Cache Invalidation] Removed ${keys.length} keys matching ${pattern}`);
      return keys.length;
    }
    return 0;
  } catch (err: any) {
    console.error(`[Cache Invalidation Error] Pattern ${pattern}:`, err.message);
    return 0;
  }
}

/**
 * Setup subscriber to listen for event.created and invalidate events and stats caches
 */
export function setupCacheInvalidationListener(subscriber: Redis = getRedisSubscriber()): void {
  subscriber.subscribe('event.created', (err) => {
    if (err) {
      console.error('[Cache Listener] Failed to subscribe to event.created:', err.message);
    } else {
      console.log('[Cache Listener] Subscribed to event.created for automatic cache invalidation');
    }
  });

  subscriber.on('message', async (channel) => {
    if (channel === 'event.created') {
      console.log(
        '[Cache Listener] event.created received. Invalidating events and stats cache...'
      );
      await Promise.all([
        invalidateCachePattern('cache:events:*'),
        invalidateCachePattern('cache:stats:*'),
      ]);
    }
  });
}
