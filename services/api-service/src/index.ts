import dns from 'dns';
import { createApp } from './app';
import { runMigrations, closePool } from '@mission-control/db';
import { closeRedis } from './redis';
import { setupCacheInvalidationListener } from './middleware/cache.middleware';
import { config } from './config';

// Prefer IPv4 to prevent ENETUNREACH in environments without IPv6 routing
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignore on older node runtimes
}

async function main() {
  console.log('[API Service] Starting API service...');

  // Ensure database schema is ready
  try {
    await runMigrations();
  } catch (err: any) {
    console.warn(
      '[API Service] Migration warning (will proceed if DB is already up):',
      err.message
    );
  }

  // Setup Redis cache invalidation listener for event.created
  try {
    setupCacheInvalidationListener();
  } catch (err: any) {
    console.warn('[API Service] Redis cache listener warning:', err.message);
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[API Service] HTTP server listening on port ${config.port}`);
  });

  const shutdown = async () => {
    console.log('[API Service] Shutting down gracefully...');
    server.close();
    await closeRedis();
    await closePool();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[API Service Fatal Error]', err);
    process.exit(1);
  });
}

export * from './app';
export * from './config';
export * from './redis';
