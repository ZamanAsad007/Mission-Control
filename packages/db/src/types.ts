export interface DbEvent {
  id?: string;
  source: 'DONKI_FLR' | 'DONKI_CME' | 'EONET';
  source_id: string;
  category: string;
  title: string;
  severity?: string | null;
  started_at: Date | string;
  ended_at?: Date | string | null;
  latitude?: number | null;
  longitude?: number | null;
  payload?: Record<string, any>;
  fetched_at?: Date | string;
}

export interface DbAsteroid {
  neo_id: string;
  name: string;
  approach_date: string; // YYYY-MM-DD
  miss_distance_km: number;
  velocity_kps: number;
  diameter_min_m?: number | null;
  diameter_max_m?: number | null;
  hazardous: boolean;
  payload?: Record<string, any>;
  fetched_at?: Date | string;
}

export interface DbApod {
  date: string; // YYYY-MM-DD
  title: string;
  explanation: string;
  url: string;
  hd_url?: string | null;
  media_type?: string;
  copyright?: string | null;
  fetched_at?: Date | string;
}

export interface DbIngestionRun {
  id?: string;
  job_name: string;
  started_at?: Date | string;
  finished_at?: Date | string | null;
  status: 'running' | 'completed' | 'failed';
  records_upserted: number;
  error?: string | null;
}

export interface DbSpaceWeatherStat {
  date: string;
  flare_class: string | null;
  count: number;
}

