import Redis from 'ioredis';
import { DbEvent } from '@mission-control/db';

export const EVENT_CREATED_CHANNEL = 'event.created';

export async function publishEventCreated(redis: Redis, event: DbEvent): Promise<number> {
  const payload = JSON.stringify({
    event: 'event.created',
    data: event,
    timestamp: new Date().toISOString(),
  });
  return redis.publish(EVENT_CREATED_CHANNEL, payload);
}

export async function publishEventsCreated(redis: Redis, events: DbEvent[]): Promise<number> {
  let publishedCount = 0;
  for (const event of events) {
    await publishEventCreated(redis, event);
    publishedCount++;
  }
  return publishedCount;
}
