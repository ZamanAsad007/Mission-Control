import { NasaClient } from '@mission-control/nasa-client';
import { runMigrations, getPool, closePool } from '@mission-control/db';
import { getRedisConnection, closeRedis } from '../redis';
import { config } from '../config';
import { runApodJob } from '../jobs/apod.job';
import { runNeoWsJob } from '../jobs/neows.job';
import { runDonkiJob } from '../jobs/donki.job';
import { runEonetJob } from '../jobs/eonet.job';

export interface BackfillOptions {
  client?: NasaClient;
  pool?: any;
  redis?: any;
  days?: number;
}

export interface BackfillResult {
  apod: { count: number; date: string };
  neows: { count: number; elementCount: number };
  donki: { count: number; flaresCount: number; cmesCount: number; newEventsCount: number };
  eonet: { count: number; newEventsCount: number };
}

export async function runBackfill(options?: BackfillOptions): Promise<BackfillResult> {
  const days = options?.days || 30;
  const client = options?.client || new NasaClient({ apiKey: config.nasaApiKey });
  const pool = options?.pool || getPool();
  const redis = options?.redis || getRedisConnection();

  console.log('====================================================');
  console.log(`[Backfill] Starting ${days}-day historical backfill...`);
  console.log('====================================================');

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // 1. APOD
  let apodResult = { count: 0, date: '' };
  try {
    console.log('\n[1/4] Ingesting APOD...');
    apodResult = await runApodJob(client, pool);
    console.log(`[1/4] APOD done: ${apodResult.count} record (${apodResult.date})`);
  } catch (err: any) {
    console.warn(`[1/4] APOD skipped due to error: ${err.message}`);
  }

  // 2. NeoWs
  let neowsResult = { count: 0, elementCount: 0 };
  try {
    console.log('\n[2/4] Ingesting Near-Earth Asteroids (next 7 days)...');
    neowsResult = await runNeoWsJob(client, pool, today, sevenDaysLater);
    console.log(`[2/4] NeoWs done: ${neowsResult.count} asteroids upserted`);
  } catch (err: any) {
    console.warn(`[2/4] NeoWs skipped due to error: ${err.message}`);
  }

  // 3. DONKI
  let donkiResult = { count: 0, flaresCount: 0, cmesCount: 0, newEventsCount: 0 };
  try {
    console.log(
      `\n[3/4] Ingesting DONKI Space Weather (last ${days} days: ${thirtyDaysAgo} to ${today})...`
    );
    donkiResult = await runDonkiJob(client, pool, redis, {
      startDate: thirtyDaysAgo,
      endDate: today,
    });
    console.log(
      `[3/4] DONKI done: ${donkiResult.count} events (${donkiResult.flaresCount} flares, ${donkiResult.cmesCount} CMEs, ${donkiResult.newEventsCount} new)`
    );
  } catch (err: any) {
    console.warn(`[3/4] DONKI skipped due to NASA API error: ${err.message}`);
  }

  // 4. EONET
  let eonetResult = { count: 0, newEventsCount: 0 };
  try {
    console.log(`\n[4/4] Ingesting EONET Natural Events (last ${days} days)...`);
    eonetResult = await runEonetJob(client, pool, redis, {
      days,
      status: 'all',
    });
    console.log(
      `[4/4] EONET done: ${eonetResult.count} events (${eonetResult.newEventsCount} new)`
    );
  } catch (err: any) {
    console.warn(`[4/4] EONET skipped due to NASA API error: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log('[Backfill] Historical backfill completed!');
  console.log(`Summary:`);
  console.log(`  - APOD: ${apodResult.count} record (${apodResult.date || 'skipped'})`);
  console.log(`  - NeoWs: ${neowsResult.count} asteroids`);
  console.log(
    `  - DONKI: ${donkiResult.count} space events (${donkiResult.flaresCount} flares, ${donkiResult.cmesCount} CMEs)`
  );
  console.log(`  - EONET: ${eonetResult.count} natural events`);
  console.log('====================================================\n');

  return {
    apod: apodResult,
    neows: neowsResult,
    donki: donkiResult,
    eonet: eonetResult,
  };
}

if (require.main === module) {
  (async () => {
    try {
      await runMigrations();
      await runBackfill();
      await closeRedis();
      await closePool();
      process.exit(0);
    } catch (err) {
      console.error('[Backfill Error]', err);
      await closeRedis();
      await closePool();
      process.exit(1);
    }
  })();
}
