import dns from 'dns';
import { AlertEngine } from './engine';
import { getRedisSubscriber, closeRedis } from './redis';
import { runMigrations, closePool } from '@mission-control/db';

// Prefer IPv4 to prevent ENETUNREACH in environments without IPv6 routing
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignore on older node runtimes
}

async function main() {
  console.log('[Alert Service] Starting Alert Service...');

  // Ensure DB schema is up-to-date
  try {
    await runMigrations();
  } catch (err: any) {
    console.warn('[Alert Service] Migration check:', err.message);
  }

  const engine = new AlertEngine();
  const subscriber = getRedisSubscriber();

  subscriber.subscribe('event.created', 'asteroid.created', (err) => {
    if (err) {
      console.error('[Alert Service] Failed to subscribe to Redis channels:', err.message);
    } else {
      console.log('[Alert Service] Successfully subscribed to event.created and asteroid.created');
    }
  });

  subscriber.on('message', async (channel, message) => {
    try {
      const parsed = JSON.parse(message);
      const data = parsed.data || parsed;

      if (channel === 'event.created') {
        console.log(`[Alert Service] Received new event: ${data.title} (${data.category})`);
        await engine.processEvent(data);
      } else if (channel === 'asteroid.created') {
        console.log(`[Alert Service] Received new asteroid: ${data.name}`);
        await engine.processAsteroid(data);
      }
    } catch (err: any) {
      console.error('[Alert Service Processing Error]', err.message);
    }
  });

  const shutdown = async () => {
    console.log('[Alert Service] Shutting down gracefully...');
    await closeRedis();
    await closePool();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[Alert Service Fatal Error]', err);
    process.exit(1);
  });
}

export * from './engine';
export * from './matcher';
export * from './notifiers';
export * from './config';
export * from './redis';
