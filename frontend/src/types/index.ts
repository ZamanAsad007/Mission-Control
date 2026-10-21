export interface ApodRecord {
  date: string;
  title: string;
  explanation: string;
  url: string;
  hd_url?: string;
  media_type: 'image' | 'video';
  copyright?: string;
}

export interface GeoLocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface MissionEvent {
  id: string;
  source: string;
  source_id: string;
  category: string;
  title: string;
  severity: string | null;
  started_at: string;
  ended_at: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location?: GeoLocation | null;
  payload?: Record<string, any>;
  fetched_at: string;
}

export interface Asteroid {
  neo_id: string;
  name: string;
  approach_date: string;
  miss_distance_km: number | string;
  velocity_kps: number | string;
  diameter_min_m: number | string;
  diameter_max_m: number | string;
  hazardous: boolean;
  payload?: Record<string, any>;
}

export interface AlertRule {
  id: string;
  user_id: string;
  name: string;
  type: 'solar_flare' | 'asteroid' | 'natural_event';
  config: {
    minClass?: string;
    hazardousOnly?: boolean;
    maxMissDistanceKm?: number;
    categories?: string[];
    center?: [number, number];
    radiusKm?: number;
  };
  channels: ('telegram' | 'discord' | 'email')[];
  cooldown_minutes: number;
  active: boolean;
  created_at: string;
}

export interface AlertDelivery {
  id: string;
  rule_id: string;
  event_ref: string;
  channel: 'telegram' | 'discord' | 'email';
  status: 'sent' | 'failed' | 'cooldown' | 'skipped';
  sent_at: string;
  error?: string | null;
}

export interface User {
  id: string;
  email: string;
  telegram_chat_id?: string | null;
  discord_webhook?: string | null;
  created_at?: string;
}

export interface SpaceWeatherStat {
  date: string;
  c_class: number;
  m_class: number;
  x_class: number;
  total_flares: number;
  cme_count: number;
}

export interface HealthResponse {
  status: string;
  ingestion: Record<
    string,
    {
      last_run: string | null;
      status: string;
      error?: string;
      records_upserted?: number;
    }
  >;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string | null;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface CosmicProfile {
  daysAlive: number;
  earthYears: number;
  mercuryYears: number;
  venusYears: number;
  marsYears: number;
  jupiterYears: number;
  saturnYears: number;
  distanceAroundSunKm: number;
}

export interface EpicImage {
  date: string;
  caption: string;
  imageUrl: string;
  coordinates?: {
    lat: number;
    lon: number;
  } | null;
}

export interface CosmicBirthdayData {
  date: string;
  apod: ApodRecord;
  epic: EpicImage;
  cosmicProfile: CosmicProfile;
  anniversaryEvents: MissionEvent[];
  anniversaryAsteroids: Asteroid[];
}
