import { Pool } from 'pg';
import { getPool } from '../client';
import { DbUser } from '../types';

export async function createUser(
  user: Omit<DbUser, 'id' | 'created_at'>,
  pool: Pool = getPool()
): Promise<DbUser> {
  const query = `
    INSERT INTO users (email, password_hash, telegram_chat_id, discord_webhook)
    VALUES ($1, $2, $3, $4)
    RETURNING id, email, password_hash, telegram_chat_id, discord_webhook, created_at;
  `;
  const result = await pool.query(query, [
    user.email.toLowerCase().trim(),
    user.password_hash,
    user.telegram_chat_id || null,
    user.discord_webhook || null,
  ]);
  return result.rows[0];
}

export async function getUserByEmail(email: string, pool: Pool = getPool()): Promise<DbUser | null> {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
  return result.rows[0] || null;
}

export async function getUserById(id: string, pool: Pool = getPool()): Promise<DbUser | null> {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function updateUserIntegrations(
  id: string,
  integrations: { telegram_chat_id?: string | null; discord_webhook?: string | null },
  pool: Pool = getPool()
): Promise<DbUser | null> {
  const updates: string[] = [];
  const params: any[] = [id];

  if (integrations.telegram_chat_id !== undefined) {
    params.push(integrations.telegram_chat_id);
    updates.push(`telegram_chat_id = $${params.length}`);
  }
  if (integrations.discord_webhook !== undefined) {
    params.push(integrations.discord_webhook);
    updates.push(`discord_webhook = $${params.length}`);
  }

  if (updates.length === 0) {
    return getUserById(id, pool);
  }

  const query = `
    UPDATE users SET ${updates.join(', ')}
    WHERE id = $1
    RETURNING id, email, password_hash, telegram_chat_id, discord_webhook, created_at;
  `;
  const result = await pool.query(query, params);
  return result.rows[0] || null;
}
