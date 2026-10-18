import { NasaClient, NearEarthObject } from '@mission-control/nasa-client';
import { upsertAsteroids, getPool, DbAsteroid } from '@mission-control/db';
import { Pool } from 'pg';

export function normalizeAsteroid(a: NearEarthObject, fallbackDate: string): DbAsteroid {
  const closeApproach = a.close_approach_data && a.close_approach_data.length > 0
    ? a.close_approach_data[0]
    : null;

  return {
    neo_id: a.id,
    name: a.name,
    approach_date: closeApproach ? closeApproach.close_approach_date : fallbackDate,
    miss_distance_km: closeApproach ? parseFloat(closeApproach.miss_distance.kilometers) : 0,
    velocity_kps: closeApproach ? parseFloat(closeApproach.relative_velocity.kilometers_per_second) : 0,
    diameter_min_m: a.estimated_diameter?.meters?.estimated_diameter_min ?? null,
    diameter_max_m: a.estimated_diameter?.meters?.estimated_diameter_max ?? null,
    hazardous: Boolean(a.is_potentially_hazardous_asteroid),
    payload: a,
  };
}

export async function runNeoWsJob(
  client: NasaClient,
  pool: Pool = getPool(),
  startDateStr?: string,
  endDateStr?: string
): Promise<{ count: number; elementCount: number }> {
  const start = startDateStr ? new Date(startDateStr) : new Date();
  const end = endDateStr
    ? new Date(endDateStr)
    : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  const startIso = start.toISOString().slice(0, 10);
  const endIso = end.toISOString().slice(0, 10);

  console.log(`[NeoWs Job] Fetching asteroids from ${startIso} to ${endIso}...`);
  const feed = await client.getNeoWsFeed(startIso, endIso);

  const normalizedAsteroids: DbAsteroid[] = feed.asteroids.map((ast) =>
    normalizeAsteroid(ast, startIso)
  );

  const result = await upsertAsteroids(normalizedAsteroids, pool);
  console.log(`[NeoWs Job] Successfully upserted ${result.upsertedCount} asteroids`);

  return {
    count: result.upsertedCount,
    elementCount: feed.elementCount,
  };
}
