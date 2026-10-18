import { NasaClient, EonetEvent, EonetGeometry } from '@mission-control/nasa-client';
import { upsertEvents, getPool, DbEvent } from '@mission-control/db';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { publishEventsCreated } from '../events/publisher';

/**
 * Recursively extracts [longitude, latitude] coordinates from GeoJSON structures (Point, Polygon, LineString)
 */
export function extractPointCoordinates(coords: any): [number, number] | null {
  if (!Array.isArray(coords) || coords.length === 0) {
    return null;
  }

  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    const lng = coords[0];
    const lat = coords[1];
    if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
      return [lng, lat];
    }
    return null;
  }

  return extractPointCoordinates(coords[0]);
}

/**
 * Normalizes EONET geometry list: selects the latest geometry timestamp for moving events (like storms)
 */
export function getLatestGeometry(geometryList: EonetGeometry[]): EonetGeometry | null {
  if (!geometryList || geometryList.length === 0) {
    return null;
  }

  if (geometryList.length === 1) {
    return geometryList[0];
  }

  // Sort by date ascending so the last element is the latest
  const sorted = [...geometryList].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return timeA - timeB;
  });

  return sorted[sorted.length - 1];
}

export function normalizeEonetEvent(evt: EonetEvent): DbEvent {
  const latestGeo = getLatestGeometry(evt.geometry);
  const coords = latestGeo ? extractPointCoordinates(latestGeo.coordinates) : null;

  // Find started_at from the earliest geometry entry
  let startedAt = new Date().toISOString();
  if (evt.geometry && evt.geometry.length > 0) {
    const sorted = [...evt.geometry].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    if (sorted[0]?.date) {
      startedAt = sorted[0].date;
    }
  }

  let severity: string | null = null;
  if (latestGeo && latestGeo.magnitudeValue !== null && latestGeo.magnitudeValue !== undefined) {
    severity = `${latestGeo.magnitudeValue} ${latestGeo.magnitudeUnit || ''}`.trim();
  }

  const category = evt.categories?.[0]?.id || 'natural_event';

  return {
    source: 'EONET',
    source_id: evt.id,
    category,
    title: evt.title,
    severity,
    started_at: startedAt,
    ended_at: evt.closed ?? null,
    latitude: coords ? coords[1] : null,
    longitude: coords ? coords[0] : null,
    payload: evt,
  };
}

export async function runEonetJob(
  client: NasaClient,
  pool: Pool = getPool(),
  redis?: Redis,
  params?: {
    category?: string;
    days?: number;
    status?: 'open' | 'closed' | 'all';
    limit?: number;
  }
): Promise<{ count: number; newEventsCount: number }> {
  const queryParams = {
    days: 30,
    status: 'all' as const,
    ...params,
  };

  console.log(`[EONET Job] Fetching natural events with params:`, queryParams);
  const events = await client.getEonetEvents(queryParams);

  const normalizedEvents: DbEvent[] = events.map(normalizeEonetEvent);

  const result = await upsertEvents(normalizedEvents, pool);
  console.log(
    `[EONET Job] Successfully upserted ${result.upsertedCount} natural events (${result.newEvents.length} new)`
  );

  if (redis && result.newEvents.length > 0) {
    await publishEventsCreated(redis, result.newEvents);
    console.log(`[EONET Job] Published ${result.newEvents.length} new natural events to Redis`);
  }

  return {
    count: result.upsertedCount,
    newEventsCount: result.newEvents.length,
  };
}
