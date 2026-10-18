import { NasaClient } from '@mission-control/nasa-client';
import { upsertApod, getPool } from '@mission-control/db';
import { Pool } from 'pg';

export async function runApodJob(
  client: NasaClient,
  pool: Pool = getPool(),
  targetDate?: string
): Promise<{ count: number; date: string }> {
  console.log(`[APOD Job] Fetching APOD${targetDate ? ` for ${targetDate}` : ' for today'}...`);
  const apod = await client.getApod(targetDate ? { date: targetDate } : undefined);

  await upsertApod(
    {
      date: apod.date,
      title: apod.title,
      explanation: apod.explanation,
      url: apod.url,
      hd_url: apod.hdurl,
      media_type: apod.media_type,
      copyright: apod.copyright,
    },
    pool
  );

  console.log(`[APOD Job] Successfully upserted APOD for ${apod.date}`);
  return { count: 1, date: apod.date };
}
