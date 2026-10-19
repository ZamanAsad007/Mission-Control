import type {
  ApodRecord,
  MissionEvent,
  Asteroid,
  AlertRule,
  AlertDelivery,
  User,
  HealthResponse,
  SpaceWeatherStat,
  ApiResponse,
} from '@/types';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('mc_token');
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem('mc_token', token);
  } else {
    localStorage.removeItem('mc_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const body = await response.json();
      errorMsg = body.error || body.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data;
}

// APOD endpoints
export async function getApodToday(): Promise<ApiResponse<ApodRecord>> {
  return request<ApiResponse<ApodRecord>>('/apod/today');
}

export async function getApodByDate(date: string): Promise<ApiResponse<ApodRecord>> {
  return request<ApiResponse<ApodRecord>>(`/apod?date=${encodeURIComponent(date)}`);
}

// Events endpoints
export async function getEvents(params?: {
  category?: string;
  from?: string;
  to?: string;
  bbox?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<MissionEvent[]>> {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  if (params?.bbox) query.set('bbox', params.bbox);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));

  const qs = query.toString();
  return request<ApiResponse<MissionEvent[]>>(`/events${qs ? `?${qs}` : ''}`);
}

export async function getNearbyEvents(lat: number, lng: number, radiusKm: number = 500): Promise<ApiResponse<MissionEvent[]>> {
  return request<ApiResponse<MissionEvent[]>>(`/events/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`);
}

export async function getEventById(id: string): Promise<ApiResponse<MissionEvent>> {
  return request<ApiResponse<MissionEvent>>(`/events/${id}`);
}

// Asteroids endpoints
export async function getAsteroids(params?: {
  from?: string;
  to?: string;
  hazardous?: boolean;
}): Promise<ApiResponse<Asteroid[]>> {
  const query = new URLSearchParams();
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  if (params?.hazardous !== undefined) query.set('hazardous', String(params.hazardous));

  const qs = query.toString();
  return request<ApiResponse<Asteroid[]>>(`/asteroids${qs ? `?${qs}` : ''}`);
}

// Space Weather Stats
export async function getSpaceWeatherStats(days: number = 30): Promise<ApiResponse<SpaceWeatherStat[]>> {
  return request<ApiResponse<SpaceWeatherStat[]>>(`/stats/space-weather?days=${days}`);
}

// Health status
export async function getHealth(): Promise<ApiResponse<HealthResponse>> {
  return request<ApiResponse<HealthResponse>>('/health');
}

// Auth endpoints
export async function apiLogin(email: string, password: string): Promise<ApiResponse<{ token: string; user: User }>> {
  return request<ApiResponse<{ token: string; user: User }>>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiRegister(
  email: string,
  password: string,
  options?: { telegram_chat_id?: string; discord_webhook?: string }
): Promise<ApiResponse<{ token: string; user: User }>> {
  return request<ApiResponse<{ token: string; user: User }>>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, ...options }),
  });
}

export async function apiGetMe(): Promise<ApiResponse<User>> {
  return request<ApiResponse<User>>('/auth/me');
}

// Alert rules
export async function getAlertRules(): Promise<ApiResponse<AlertRule[]>> {
  return request<ApiResponse<AlertRule[]>>('/alerts/rules');
}

export async function createAlertRule(rule: Partial<AlertRule>): Promise<ApiResponse<AlertRule>> {
  return request<ApiResponse<AlertRule>>('/alerts/rules', {
    method: 'POST',
    body: JSON.stringify(rule),
  });
}

export async function updateAlertRule(id: string, rule: Partial<AlertRule>): Promise<ApiResponse<AlertRule>> {
  return request<ApiResponse<AlertRule>>(`/alerts/rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(rule),
  });
}

export async function deleteAlertRule(id: string): Promise<ApiResponse<{ message: string }>> {
  return request<ApiResponse<{ message: string }>>(`/alerts/rules/${id}`, {
    method: 'DELETE',
  });
}

export async function getAlertHistory(params?: {
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<AlertDelivery[]>> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));

  const qs = query.toString();
  return request<ApiResponse<AlertDelivery[]>>(`/alerts/history${qs ? `?${qs}` : ''}`);
}

export async function sendTestAlert(data: {
  channel: 'telegram' | 'discord' | 'email';
  target?: string;
  message?: string;
}): Promise<ApiResponse<{ message: string; success: boolean }>> {
  return request<ApiResponse<{ message: string; success: boolean }>>('/alerts/test', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
