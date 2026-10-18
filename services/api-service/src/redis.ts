import Redis from 'ioredis';
import { config } from './config';

let redisClient: Redis | null = null;
let redisSubscriber: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    if (config.redis.url) {
      redisClient = new Redis(config.redis.url, {
        maxRetriesPerRequest: null,
      });
    } else {
      redisClient = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        maxRetriesPerRequest: null,
      });
    }

    redisClient.on('error', (err) => {
      console.error('[API Redis Client Error]', err.message);
    });
  }
  return redisClient;
}

export function getRedisSubscriber(): Redis {
  if (!redisSubscriber) {
    if (config.redis.url) {
      redisSubscriber = new Redis(config.redis.url);
    } else {
      redisSubscriber = new Redis({
        host: config.redis.host,
        port: config.redis.port,
      });
    }

    redisSubscriber.on('error', (err) => {
      console.error('[API Redis Subscriber Error]', err.message);
    });
  }
  return redisSubscriber;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  if (redisSubscriber) {
    await redisSubscriber.quit();
    redisSubscriber = null;
  }
}
