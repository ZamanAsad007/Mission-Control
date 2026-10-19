import { Pool } from 'pg';
import { getPool } from '../client';
import { DbAlertRule, AlertRuleType } from '../types';

export interface EnrichedAlertRule extends DbAlertRule {
  user_email: string;
  telegram_chat_id: string | null;
  discord_webhook: string | null;
}

export async function getActiveRules(
  type?: AlertRuleType,
  pool: Pool = getPool()
): Promise<EnrichedAlertRule[]> {
  let query = `
    SELECT r.id, r.user_id, r.name, r.type, r.config, r.channels, r.cooldown_minutes, r.active, r.created_at,
           u.email as user_email, u.telegram_chat_id, u.discord_webhook
    FROM alert_rules r
    JOIN users u ON r.user_id = u.id
    WHERE r.active = TRUE
  `;
  const params: any[] = [];

  if (type) {
    params.push(type);
    query += ` AND r.type = $1`;
  }

  query += ` ORDER BY r.created_at ASC;`;

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getRulesByUserId(
  userId: string,
  pool: Pool = getPool()
): Promise<DbAlertRule[]> {
  const query = `
    SELECT id, user_id, name, type, config, channels, cooldown_minutes, active, created_at
    FROM alert_rules
    WHERE user_id = $1
    ORDER BY created_at DESC;
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
}

export async function getRuleById(id: string, pool: Pool = getPool()): Promise<DbAlertRule | null> {
  const query = `
    SELECT id, user_id, name, type, config, channels, cooldown_minutes, active, created_at
    FROM alert_rules
    WHERE id = $1;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

export async function createRule(
  rule: Omit<DbAlertRule, 'id' | 'created_at'>,
  pool: Pool = getPool()
): Promise<DbAlertRule> {
  const query = `
    INSERT INTO alert_rules (user_id, name, type, config, channels, cooldown_minutes, active)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, user_id, name, type, config, channels, cooldown_minutes, active, created_at;
  `;
  const values = [
    rule.user_id,
    rule.name,
    rule.type,
    JSON.stringify(rule.config || {}),
    rule.channels || [],
    rule.cooldown_minutes ?? 60,
    rule.active ?? true,
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function updateRule(
  id: string,
  userId: string,
  updates: Partial<Omit<DbAlertRule, 'id' | 'user_id' | 'created_at'>>,
  pool: Pool = getPool()
): Promise<DbAlertRule | null> {
  const setClauses: string[] = [];
  const params: any[] = [id, userId];

  if (updates.name !== undefined) {
    params.push(updates.name);
    setClauses.push(`name = $${params.length}`);
  }
  if (updates.type !== undefined) {
    params.push(updates.type);
    setClauses.push(`type = $${params.length}`);
  }
  if (updates.config !== undefined) {
    params.push(JSON.stringify(updates.config));
    setClauses.push(`config = $${params.length}`);
  }
  if (updates.channels !== undefined) {
    params.push(updates.channels);
    setClauses.push(`channels = $${params.length}`);
  }
  if (updates.cooldown_minutes !== undefined) {
    params.push(updates.cooldown_minutes);
    setClauses.push(`cooldown_minutes = $${params.length}`);
  }
  if (updates.active !== undefined) {
    params.push(updates.active);
    setClauses.push(`active = $${params.length}`);
  }

  if (setClauses.length === 0) {
    return getRuleById(id, pool);
  }

  const query = `
    UPDATE alert_rules
    SET ${setClauses.join(', ')}
    WHERE id = $1 AND user_id = $2
    RETURNING id, user_id, name, type, config, channels, cooldown_minutes, active, created_at;
  `;
  const result = await pool.query(query, params);
  return result.rows[0] || null;
}

export async function deleteRule(
  id: string,
  userId: string,
  pool: Pool = getPool()
): Promise<boolean> {
  const query = `DELETE FROM alert_rules WHERE id = $1 AND user_id = $2;`;
  const result = await pool.query(query, [id, userId]);
  return (result.rowCount ?? 0) > 0;
}
