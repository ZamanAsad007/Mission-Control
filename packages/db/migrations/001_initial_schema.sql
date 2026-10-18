-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Unified feed of space/earth events (flares, CMEs, natural events)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,              -- 'DONKI_FLR' | 'DONKI_CME' | 'EONET'
  source_id TEXT NOT NULL,
  category TEXT NOT NULL,            -- 'solar_flare' | 'cme' | 'wildfire' | 'storm' | 'volcano' ...
  title TEXT NOT NULL,
  severity TEXT NULL,                -- e.g. flare class 'X1.2' or normalized low/med/high
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NULL,
  location GEOGRAPHY(Point, 4326) NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_events_source_source_id UNIQUE (source, source_id)
);

-- 2. Near-Earth Asteroids
CREATE TABLE IF NOT EXISTS asteroids (
  neo_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  approach_date DATE NOT NULL,
  miss_distance_km NUMERIC NOT NULL,
  velocity_kps NUMERIC NOT NULL,
  diameter_min_m NUMERIC NULL,
  diameter_max_m NUMERIC NULL,
  hazardous BOOLEAN NOT NULL DEFAULT FALSE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Astronomy Picture of the Day
CREATE TABLE IF NOT EXISTS apod (
  date DATE PRIMARY KEY,
  title TEXT NOT NULL,
  explanation TEXT NOT NULL,
  url TEXT NOT NULL,
  hd_url TEXT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  copyright TEXT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Ingestion Runs Tracker
CREATE TABLE IF NOT EXISTS ingestion_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL,              -- 'running' | 'completed' | 'failed'
  records_upserted INT NOT NULL DEFAULT 0,
  error TEXT NULL
);

-- Indexes for performance & PostGIS spatial queries
CREATE INDEX IF NOT EXISTS idx_events_started_at ON events(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_location ON events USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_asteroids_approach_date ON asteroids(approach_date ASC);
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_job_name ON ingestion_runs(job_name, started_at DESC);
