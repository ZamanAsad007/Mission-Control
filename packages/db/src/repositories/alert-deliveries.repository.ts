import { Pool } from 'pg';
import { getPool } from '../client';
import { DbAlertDelivery } from '../types';

export async function createDelivery(
  delivery: Omit<DbAlertDelivery, 'id' | 'sent_at'>,
  pool: Pool = getPool()
): Promise<DbAlertDelivery> {
  const query = `
    INSERT INTO alert_deliveries (rule_id, event_ref, channel, status, error)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, rule_id, event_ref, channel, status, sent_at, error;
  `;
  const result = await pool.query(query, [
    delivery.rule_id,
    delivery.event_ref,
    delivery.channel,
    delivery.status,
    delivery.error || null,
  ]);
  return result.rows[0];
}

export async function isWithinCooldown(
  ruleId: string,
  cooldownMinutes: number,
  pool: Pool = getPool()
): Promise<boolean> {
  if (cooldownMinutes <= 0) return false;

  const query = `
    SELECT 1 FROM alert_deliveries
    WHERE rule_id = $1
      AND status = 'sent'
      AND sent_at >= NOW() - ($2 || ' minutes')::interval
    LIMIT 1;
  `;
  const result = await pool.query(query, [ruleId, cooldownMinutes]);
  return result.rows.length > 0;
}

export async function isAlreadyDelivered(
  ruleId: string,
  eventRef: string,
  channel: string,
  pool: Pool = getPool()
): Promise<boolean> {
  const query = `
    SELECT 1 FROM alert_deliveries
    WHERE rule_id = $1
      AND event_ref = $2
      AND channel = $3
      AND status = 'sent'
    LIMIT 1;
  `;
  const result = await pool.query(query, [ruleId, eventRef, channel]);
  return result.rows.length > 0;
}

export async function getDeliveriesByUserId(
  userId: string,
  limit = 50,
  offset = 0,
  pool: Pool = getPool()
): Promise<DbAlertDelivery[]> {
  const query = `
    SELECT d.id, d.rule_id, d.event_ref, d.channel, d.status, d.sent_at, d.error,
           r.name as rule_name, r.type as rule_type
    FROM alert_deliveries d
    JOIN alert_rules r ON d.rule_id = r.id
    WHERE r.user_id = $1
    ORDER BY d.sent_at DESC
    LIMIT $2 OFFSET $3;
  `;
  const result = await pool.query(query, [userId, limit, offset]);
  return result.rows;
}

export async function getDeliveriesByRuleId(
  ruleId: string,
  limit = 50,
  pool: Pool = getPool()
): Promise<DbAlertDelivery[]> {
  const query = `
    SELECT id, rule_id, event_ref, channel, status, sent_at, error
    FROM alert_deliveries
    WHERE rule_id = $1
    ORDER BY sent_at DESC
    LIMIT $2;
  `;
  const result = await pool.query(query, [ruleId, limit]);
  return result.rows;
}
