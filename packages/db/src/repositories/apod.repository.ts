import { Pool } from 'pg';
import { getPool } from '../client';
import { DbApod } from '../types';

function normalizeApod(row: any): DbApod | null {
  if (!row) return null;
  const dateStr =
    row.date instanceof Date
      ? row.date.toISOString().slice(0, 10)
      : typeof row.date === 'string'
      ? row.date.slice(0, 10)
      : String(row.date);
  return {
    ...row,
    date: dateStr,
  };
}

export async function upsertApod(apod: DbApod, pool: Pool = getPool()): Promise<DbApod> {
  const query = `
    INSERT INTO apod (date, title, explanation, url, hd_url, media_type, copyright, fetched_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    ON CONFLICT (date) DO UPDATE SET
      title = EXCLUDED.title,
      explanation = EXCLUDED.explanation,
      url = EXCLUDED.url,
      hd_url = EXCLUDED.hd_url,
      media_type = EXCLUDED.media_type,
      copyright = EXCLUDED.copyright,
      fetched_at = NOW()
    RETURNING date, title, explanation, url, hd_url, media_type, copyright, fetched_at;
  `;

  const values = [
    apod.date,
    apod.title,
    apod.explanation,
    apod.url,
    apod.hd_url || null,
    apod.media_type || 'image',
    apod.copyright || null,
  ];

  const result = await pool.query(query, values);
  return normalizeApod(result.rows[0])!;
}

export async function getApodByDate(date: string, pool: Pool = getPool()): Promise<DbApod | null> {
  const result = await pool.query('SELECT * FROM apod WHERE date = $1', [date]);
  return normalizeApod(result.rows[0]);
}

export async function getLatestApod(pool: Pool = getPool()): Promise<DbApod | null> {
  const result = await pool.query('SELECT * FROM apod ORDER BY date DESC LIMIT 1');
  return normalizeApod(result.rows[0]);
}
