import fs from 'fs';
import path from 'path';
import { getPool, closePool } from './client';

export async function runMigrations(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    console.log('[DB Migration] Starting migrations...');
    await client.query('BEGIN');

    // Create migrations tracker table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const migrationsDir = path.resolve(__dirname, '../migrations');
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found at ${migrationsDir}`);
    }

    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      const existing = await client.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [file]);
      if (existing.rows.length === 0) {
        console.log(`[DB Migration] Applying ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        console.log(`[DB Migration] Successfully applied ${file}`);
      } else {
        console.log(`[DB Migration] Skipping already applied ${file}`);
      }
    }

    await client.query('COMMIT');
    console.log('[DB Migration] All migrations executed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DB Migration Error]', err);
    throw err;
  } finally {
    client.release();
  }
}

// Allow direct CLI execution: node dist/migrate.js
if (require.main === module) {
  runMigrations()
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      await closePool();
      process.exit(1);
    });
}
