import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedisClient } from '../redis';

export function createRateLimiter(options?: {
  windowMs?: number;
  max?: number;
  message?: string;
  useMemoryStore?: boolean;
}) {
  const windowMs = options?.windowMs || 15 * 60 * 1000; // 15 minutes default
  const max = options?.max || 100; // 100 requests per window
  const message = options?.message || 'Too many requests from this IP, please try again later.';

  let store: any;
  if (!options?.useMemoryStore && process.env.NODE_ENV !== 'test') {
    try {
      const redis = getRedisClient();
      store = new RedisStore({
        // @ts-expect-error - ioredis sendCommand compatibility
        sendCommand: (...args: string[]) => redis.call(...args),
        prefix: 'rl:',
      });
    } catch (err: any) {
      console.warn('[RateLimiter] Falling back to in-memory rate limiter:', err.message);
    }
  }

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        data: null,
        error: message,
      });
    },
  });
}
