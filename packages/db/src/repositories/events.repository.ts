import { Pool } from 'pg';
import { getPool } from '../client';
import { DbEvent, DbSpaceWeatherStat } from '../types';

export interface UpsertEventsResult {
  upsertedCount: number;
  newEvents: DbEvent[];
}

export async function upsertEvents(
  events: DbEvent[],
  pool: Pool = getPool()
): Promise<UpsertEventsResult> {
  if (events.length === 0) {
    return { upsertedCount: 0, newEvents: [] };
  }

  const client = await pool.connect();
  const newEvents: DbEvent[] = [];
  let count = 0;

  try {
    await client.query('BEGIN');

    for (const evt of events) {
      const hasLocation =
        evt.longitude !== null &&
        evt.longitude !== undefined &&
        evt.latitude !== null &&
        evt.latitude !== undefined;

      const query = `
        INSERT INTO events (
          source, source_id, category, title, severity,
          started_at, ended_at, location, payload, fetched_at
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7,
          CASE 
            WHEN $8::float8 IS NOT NULL AND $9::float8 IS NOT NULL 
            THEN ST_SetSRID(ST_MakePoint($8::float8, $9::float8), 4326)::geography 
            ELSE NULL 
          END,
          $10, NOW()
        )
        ON CONFLICT (source, source_id) DO UPDATE SET
          category = EXCLUDED.category,
          title = EXCLUDED.title,
          severity = EXCLUDED.severity,
          started_at = EXCLUDED.started_at,
          ended_at = EXCLUDED.ended_at,
          location = EXCLUDED.location,
          payload = EXCLUDED.payload,
          fetched_at = NOW()
        RETURNING id, source, source_id, category, title, severity, started_at, ended_at,
                  (xmax = 0) AS is_new;
      `;

      const values = [
        evt.source,
        evt.source_id,
        evt.category,
        evt.title,
        evt.severity ?? null,
        evt.started_at,
        evt.ended_at ?? null,
        hasLocation ? evt.longitude : null,
        hasLocation ? evt.latitude : null,
        JSON.stringify(evt.payload || {}),
      ];

      const res = await client.query(query, values);
      count++;

      if (res.rows[0]?.is_new) {
        newEvents.push({
          id: res.rows[0].id,
          source: res.rows[0].source,
          source_id: res.rows[0].source_id,
          category: res.rows[0].category,
          title: res.rows[0].title,
          severity: res.rows[0].severity,
          started_at: res.rows[0].started_at,
          ended_at: res.rows[0].ended_at,
          latitude: evt.latitude,
          longitude: evt.longitude,
          payload: evt.payload,
        });
      }
    }

    await client.query('COMMIT');
    return { upsertedCount: count, newEvents };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export interface EventFilter {
  category?: string;
  source?: string;
  from?: string;
  to?: string;
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  limit?: number;
  offset?: number;
}

export async function getEvents(filters: EventFilter = {}, pool: Pool = getPool()): Promise<DbEvent[]> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.category) {
    params.push(filters.category);
    conditions.push(`category = $${params.length}`);
  }

  if (filters.source) {
    params.push(filters.source);
    conditions.push(`source = $${params.length}`);
  }

  if (filters.from) {
    params.push(filters.from);
    conditions.push(`started_at >= $${params.length}`);
  }

  if (filters.to) {
    params.push(filters.to);
    conditions.push(`started_at <= $${params.length}`);
  }

  if (filters.bbox && filters.bbox.length === 4) {
    const [minLng, minLat, maxLng, maxLat] = filters.bbox;
    params.push(minLng, minLat, maxLng, maxLat);
    const p = params.length;
    conditions.push(
      `location IS NOT NULL AND (location::geometry && ST_MakeEnvelope($${p - 3}, $${p - 2}, $${p - 1}, $${p}, 4326))`
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitClause = filters.limit ? `LIMIT ${Math.min(filters.limit, 1000)}` : 'LIMIT 100';
  const offsetClause = filters.offset ? `OFFSET ${filters.offset}` : '';

  const query = `
    SELECT id, source, source_id, category, title, severity, started_at, ended_at,
           ST_Y(location::geometry) as latitude,
           ST_X(location::geometry) as longitude,
           payload, fetched_at
    FROM events
    ${whereClause}
    ORDER BY started_at DESC
    ${limitClause} ${offsetClause};
  `;

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getEventById(id: string, pool: Pool = getPool()): Promise<DbEvent | null> {
  const query = `
    SELECT id, source, source_id, category, title, severity, started_at, ended_at,
           ST_Y(location::geometry) as latitude,
           ST_X(location::geometry) as longitude,
           payload, fetched_at
    FROM events
    WHERE id = $1;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

export async function getEventsNearby(
  lat: number,
  lng: number,
  radiusKm: number,
  limit = 100,
  pool: Pool = getPool()
): Promise<DbEvent[]> {
  const radiusMeters = radiusKm * 1000;
  const query = `
    SELECT id, source, source_id, category, title, severity, started_at, ended_at,
           ST_Y(location::geometry) as latitude,
           ST_X(location::geometry) as longitude,
           ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance_meters,
           payload, fetched_at
    FROM events
    WHERE location IS NOT NULL
      AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
    ORDER BY distance_meters ASC
    LIMIT $4;
  `;

  const result = await pool.query(query, [lng, lat, radiusMeters, limit]);
  return result.rows;
}

export async function getSpaceWeatherStats(
  days = 30,
  pool: Pool = getPool()
): Promise<DbSpaceWeatherStat[]> {
  const query = `
    SELECT TO_CHAR(started_at, 'YYYY-MM-DD') as date,
           COALESCE(severity, 'Unknown') as flare_class,
           COUNT(*)::int as count
    FROM events
    WHERE category = 'solar_flare'
      AND started_at >= NOW() - ($1 || ' days')::interval
    GROUP BY TO_CHAR(started_at, 'YYYY-MM-DD'), COALESCE(severity, 'Unknown')
    ORDER BY date ASC, flare_class ASC;
  `;
  const result = await pool.query(query, [days]);
  return result.rows;
}

