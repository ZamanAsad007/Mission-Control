import { Pool } from 'pg';
import {
  DbEvent,
  DbAsteroid,
  getActiveRules,
  isAlreadyDelivered,
  isWithinCooldown,
  createDelivery,
  getPool,
} from '@mission-control/db';
import { matchRule } from './matcher';
import { getNotifier, NotificationPayload } from './notifiers';
import { formatAlertDateTime } from './utils';

export interface AlertEngineOptions {
  pool?: Pool;
  maxRetries?: number;
  initialBackoffMs?: number;
}

export class AlertEngine {
  private pool: Pool;
  private maxRetries: number;
  private initialBackoffMs: number;

  constructor(options: AlertEngineOptions = {}) {
    this.pool = options.pool || getPool();
    this.maxRetries = options.maxRetries ?? 3;
    this.initialBackoffMs = options.initialBackoffMs ?? 100;
  }

  public async processEvent(event: DbEvent): Promise<number> {
    const rules = await getActiveRules(
      event.category === 'solar_flare' ? 'solar_flare' : 'natural_event',
      this.pool
    );

    return this.evaluateRules(
      rules,
      { type: 'event', data: event },
      event.id || `${event.source}:${event.source_id}`
    );
  }

  public async processAsteroid(asteroid: DbAsteroid): Promise<number> {
    const rules = await getActiveRules('asteroid', this.pool);
    return this.evaluateRules(rules, { type: 'asteroid', data: asteroid }, asteroid.neo_id);
  }

  private async evaluateRules(
    rules: any[],
    payload: { type: 'event'; data: DbEvent } | { type: 'asteroid'; data: DbAsteroid },
    eventRef: string
  ): Promise<number> {
    let deliveredCount = 0;

    for (const rule of rules) {
      // 1. Rule Matcher
      if (!matchRule(rule, payload)) {
        continue;
      }

      // 2. Cooldown check
      const inCooldown = await isWithinCooldown(rule.id, rule.cooldown_minutes, this.pool);
      if (inCooldown) {
        console.log(
          `[AlertEngine] Rule "${rule.name}" is within ${rule.cooldown_minutes}m cooldown. Skipping.`
        );
        continue;
      }

      // 3. Deliver to each channel with deduplication and retry backoff
      for (const channel of rule.channels || []) {
        // Deduplication check
        const alreadySent = await isAlreadyDelivered(rule.id, eventRef, channel, this.pool);
        if (alreadySent) {
          console.log(
            `[AlertEngine] Event ${eventRef} already delivered to ${channel} for rule "${rule.name}". Deduplicating.`
          );
          continue;
        }

        const notifier = getNotifier(channel);
        if (!notifier) {
          console.warn(`[AlertEngine] Unsupported notification channel: ${channel}`);
          continue;
        }

        const recipient = this.getRecipientForChannel(rule, channel);
        if (!recipient) {
          console.warn(
            `[AlertEngine] No recipient configured for channel ${channel} on user ${rule.user_email}`
          );
          continue;
        }

        const notificationPayload: NotificationPayload = this.buildNotificationPayload(
          payload,
          recipient
        );

        // Retry with exponential backoff
        const deliveryResult = await this.sendWithRetry(notifier, notificationPayload);

        await createDelivery(
          {
            rule_id: rule.id,
            event_ref: eventRef,
            channel,
            status: deliveryResult.success ? 'sent' : 'failed',
            error: deliveryResult.error || null,
          },
          this.pool
        );

        if (deliveryResult.success) {
          deliveredCount++;
          console.log(
            `[AlertEngine] Alert delivered successfully via ${channel} for rule "${rule.name}"`
          );
        } else {
          console.error(
            `[AlertEngine] Alert delivery failed via ${channel}: ${deliveryResult.error}`
          );
        }
      }
    }

    return deliveredCount;
  }

  private getRecipientForChannel(rule: any, channel: string): string | null {
    switch (channel.toLowerCase()) {
      case 'telegram':
        return rule.telegram_chat_id || null;
      case 'discord':
        return rule.discord_webhook || null;
      case 'email':
        return rule.user_email || null;
      default:
        return null;
    }
  }

  private buildNotificationPayload(
    payload: { type: 'event'; data: DbEvent } | { type: 'asteroid'; data: DbAsteroid },
    recipient: string
  ): NotificationPayload {
    if (payload.type === 'event') {
      const evt = payload.data;
      return {
        recipient,
        title: evt.title,
        body: `Detected event category: ${evt.category} from ${evt.source}. Started at: ${formatAlertDateTime(evt.started_at)}`,
        severity: evt.severity,
        timestamp:
          typeof evt.started_at === 'string' ? evt.started_at : evt.started_at.toISOString(),
      };
    } else {
      const ast = payload.data;
      return {
        recipient,
        title: `Near-Earth Asteroid: ${ast.name}`,
        body: `Approach Date: ${formatAlertDateTime(ast.approach_date)}. Miss distance: ${Number(ast.miss_distance_km).toLocaleString()} km. Velocity: ${ast.velocity_kps} km/s.`,
        severity: ast.hazardous ? 'Hazardous' : 'Non-Hazardous',
        timestamp: ast.approach_date,
      };
    }
  }

  public async sendWithRetry(
    notifier: any,
    payload: NotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    let lastError: string | undefined;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const result = await notifier.send(payload);
        if (result.success) {
          return { success: true };
        }
        lastError = result.error;
      } catch (err: any) {
        lastError = err.message;
      }

      if (attempt < this.maxRetries - 1) {
        const delay = this.initialBackoffMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return { success: false, error: lastError || 'Max retries exceeded' };
  }
}
