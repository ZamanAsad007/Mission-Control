import { Pool } from 'pg';
import { getPool } from '../client';
import { DbIngestionRun } from '../types';

export async function startIngestionRun(jobName: string, pool: Pool = getPool()): Promise<string> {
  const result = await pool.query(
    `INSERT INTO ingestion_runs (job_name, started_at, status, records_upserted)
     VALUES ($1, NOW(), 'running', 0)
     RETURNING id;`,
    [jobName]
  );
  return result.rows[0].id;
}

export async function finishIngestionRun(
  id: string,
  status: 'completed' | 'failed',
  recordsUpserted: number,
  error: string | null = null,
  pool: Pool = getPool()
): Promise<DbIngestionRun> {
  const result = await pool.query(
    `UPDATE ingestion_runs
     SET finished_at = NOW(),
         status = $1,
         records_upserted = $2,
         error = $3
     WHERE id = $4
     RETURNING *;`,
    [status, recordsUpserted, error, id]
  );
  return result.rows[0];
}

export async function getLastRuns(pool: Pool = getPool()): Promise<Record<string, DbIngestionRun>> {
  const result = await pool.query(`
    SELECT DISTINCT ON (job_name) id, job_name, started_at, finished_at, status, records_upserted, error
    FROM ingestion_runs
    ORDER BY job_name, started_at DESC;
  `);

  const runs: Record<string, DbIngestionRun> = {};
  for (const row of result.rows) {
    runs[row.job_name] = row;
  }
  return runs;
}
