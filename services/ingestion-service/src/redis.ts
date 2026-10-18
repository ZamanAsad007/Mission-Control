import Redis from 'ioredis';
import { config } from './config';

let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    if (config.redis.url) {
      redisConnection = new Redis(config.redis.url, {
        maxRetriesPerRequest: null,
      });
    } else {
      redisConnection = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        maxRetriesPerRequest: null,
      });
    }

    redisConnection.on('error', (err) => {
      console.error('[Ingestion Redis Error]', err.message);
    });
  }
  return redisConnection;
}

export async function closeRedis(): Promise<void> {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}
