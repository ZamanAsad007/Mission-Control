import { Pool } from 'pg';
import { getPool } from '../client';
import { DbAsteroid } from '../types';

export async function upsertAsteroids(
  asteroids: DbAsteroid[],
  pool: Pool = getPool()
): Promise<{ upsertedCount: number }> {
  if (asteroids.length === 0) {
    return { upsertedCount: 0 };
  }

  const client = await pool.connect();
  let count = 0;

  try {
    await client.query('BEGIN');

    const query = `
      INSERT INTO asteroids (
        neo_id, name, approach_date, miss_distance_km, velocity_kps,
        diameter_min_m, diameter_max_m, hazardous, payload, fetched_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (neo_id) DO UPDATE SET
        name = EXCLUDED.name,
        approach_date = EXCLUDED.approach_date,
        miss_distance_km = EXCLUDED.miss_distance_km,
        velocity_kps = EXCLUDED.velocity_kps,
        diameter_min_m = EXCLUDED.diameter_min_m,
        diameter_max_m = EXCLUDED.diameter_max_m,
        hazardous = EXCLUDED.hazardous,
        payload = EXCLUDED.payload,
        fetched_at = NOW();
    `;

    for (const a of asteroids) {
      await client.query(query, [
        a.neo_id,
        a.name,
        a.approach_date,
        a.miss_distance_km,
        a.velocity_kps,
        a.diameter_min_m ?? null,
        a.diameter_max_m ?? null,
        a.hazardous,
        JSON.stringify(a.payload || {}),
      ]);
      count++;
    }

    await client.query('COMMIT');
    return { upsertedCount: count };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function normalizeAsteroid(row: any): DbAsteroid {
  if (!row) return row;
  const dateStr =
    row.approach_date instanceof Date
      ? row.approach_date.toISOString().slice(0, 10)
      : typeof row.approach_date === 'string'
      ? row.approach_date.slice(0, 10)
      : String(row.approach_date);
  return {
    ...row,
    approach_date: dateStr,
  };
}

export async function getAsteroidsByDateRange(
  from: string,
  to: string,
  hazardousOnly = false,
  pool: Pool = getPool()
): Promise<DbAsteroid[]> {
  let query = `
    SELECT neo_id, name, approach_date, miss_distance_km, velocity_kps,
           diameter_min_m, diameter_max_m, hazardous, payload, fetched_at
    FROM asteroids
    WHERE approach_date >= $1 AND approach_date <= $2
  `;
  const params: any[] = [from, to];

  if (hazardousOnly) {
    query += ` AND hazardous = TRUE`;
  }

  query += ` ORDER BY approach_date ASC, miss_distance_km ASC`;

  const result = await pool.query(query, params);
  return result.rows.map(normalizeAsteroid);
}
