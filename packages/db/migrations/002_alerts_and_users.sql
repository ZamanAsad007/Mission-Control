-- 5. Users table for authentication and notification endpoints
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  telegram_chat_id TEXT NULL,
  discord_webhook TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Alert Rules table
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,               -- 'solar_flare' | 'asteroid' | 'natural_event'
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  channels TEXT[] NOT NULL DEFAULT '{}', -- ARRAY['telegram', 'discord', 'email']
  cooldown_minutes INT NOT NULL DEFAULT 60,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Alert Deliveries log for cooldown & deduplication
CREATE TABLE IF NOT EXISTS alert_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  event_ref TEXT NOT NULL,
  channel TEXT NOT NULL,             -- 'telegram' | 'discord' | 'email'
  status TEXT NOT NULL,              -- 'sent' | 'failed'
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error TEXT NULL
);

-- Indexes for rule matching and cooldown checks
CREATE INDEX IF NOT EXISTS idx_alert_rules_active_type ON alert_rules(active, type);
CREATE INDEX IF NOT EXISTS idx_alert_rules_user_id ON alert_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_lookup ON alert_deliveries(rule_id, event_ref, channel, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_cooldown ON alert_deliveries(rule_id, sent_at DESC);
