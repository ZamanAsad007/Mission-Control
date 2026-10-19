import { NasaClient, SolarFlare, CoronalMassEjection } from '@mission-control/nasa-client';
import { upsertEvents, getPool, DbEvent } from '@mission-control/db';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { publishEventsCreated } from '../events/publisher';

export function normalizeSolarFlare(flare: SolarFlare): DbEvent {
  const severity = flare.classType ? flare.classType.trim().toUpperCase() : null;

  return {
    source: 'DONKI_FLR',
    source_id: flare.flrID,
    category: 'solar_flare',
    title: flare.classType
      ? `Solar Flare (${flare.classType})`
      : `Solar Flare (${flare.flrID})`,
    severity,
    started_at: flare.beginTime,
    ended_at: flare.endTime ?? null,
    latitude: null,
    longitude: null,
    payload: flare,
  };
}

export function normalizeCme(cme: CoronalMassEjection): DbEvent {
  // Find the most accurate CME analysis, or fallback to the first one
  const analysis =
    cme.cmeAnalyses?.find((a) => a.isMostAccurate) ||
    cme.cmeAnalyses?.[0];

  let severity: string | null = null;
  if (analysis) {
    if (analysis.speed !== null && analysis.speed !== undefined) {
      severity = `${analysis.speed} km/s`;
    } else if (analysis.type) {
      severity = analysis.type;
    }
  }

  return {
    source: 'DONKI_CME',
    source_id: cme.activityID,
    category: 'cme',
    title: `Coronal Mass Ejection (${cme.activityID})`,
    severity,
    started_at: cme.startTime,
    ended_at: null,
    latitude: null,
    longitude: null,
    payload: cme,
  };
}

export async function runDonkiJob(
  client: NasaClient,
  pool: Pool = getPool(),
  redis?: Redis,
  options?: { startDate?: string; endDate?: string }
): Promise<{ count: number; flaresCount: number; cmesCount: number; newEventsCount: number }> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const startDate = options?.startDate || thirtyDaysAgo;
  const endDate = options?.endDate || today;

  console.log(`[DONKI Job] Fetching space weather from ${startDate} to ${endDate}...`);

  const [flaresResult, cmesResult] = await Promise.allSettled([
    client.getDonkiSolarFlares(startDate, endDate),
    client.getDonkiCmes(startDate, endDate),
  ]);

  const flares = flaresResult.status === 'fulfilled' ? flaresResult.value : [];
  const cmes = cmesResult.status === 'fulfilled' ? cmesResult.value : [];

  if (flaresResult.status === 'rejected') {
    console.warn(`[DONKI Job] Solar flares unavailable from NASA API: ${flaresResult.reason?.message || flaresResult.reason}`);
  }
  if (cmesResult.status === 'rejected') {
    console.warn(`[DONKI Job] CMEs unavailable from NASA API: ${cmesResult.reason?.message || cmesResult.reason}`);
  }

  const normalizedEvents: DbEvent[] = [
    ...flares.map(normalizeSolarFlare),
    ...cmes.map(normalizeCme),
  ];

  const result = await upsertEvents(normalizedEvents, pool);
  console.log(
    `[DONKI Job] Upserted ${result.upsertedCount} space weather events (${flares.length} flares, ${cmes.length} CMEs, ${result.newEvents.length} new)`
  );

  if (redis && result.newEvents.length > 0) {
    await publishEventsCreated(redis, result.newEvents);
    console.log(`[DONKI Job] Published ${result.newEvents.length} new space weather events to Redis`);
  }

  return {
    count: result.upsertedCount,
    flaresCount: flares.length,
    cmesCount: cmes.length,
    newEventsCount: result.newEvents.length,
  };
}
