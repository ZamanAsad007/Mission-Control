import { createApp } from './app';
import { IngestionScheduler } from './scheduler';
import { runMigrations, closePool } from '@mission-control/db';
import { closeRedis } from './redis';
import { config } from './config';

async function main() {
  console.log('[Ingestion Service] Starting service...');

  // Ensure DB schema migrations are up-to-date
  try {
    await runMigrations();
  } catch (err: any) {
    console.warn('[Ingestion Service] Migration warning (will proceed if DB is already up):', err.message);
  }

  // Initialize scheduler
  const scheduler = new IngestionScheduler();
  try {
    await scheduler.init();
    console.log('[Ingestion Service] Scheduler initialized successfully.');
  } catch (err: any) {
    console.warn('[Ingestion Service] Redis connection/scheduler warning:', err.message);
  }

  // Start HTTP server
  const app = createApp(scheduler);
  const server = app.listen(config.port, () => {
    console.log(`[Ingestion Service] HTTP server listening on port ${config.port}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[Ingestion Service] Shutting down gracefully...');
    server.close();
    await scheduler.close();
    await closeRedis();
    await closePool();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[Ingestion Service Fatal Error]', err);
    process.exit(1);
  });
}

export * from './app';
export * from './scheduler';
export * from './jobs/apod.job';
export * from './jobs/neows.job';
export * from './jobs/donki.job';
export * from './events/publisher';

