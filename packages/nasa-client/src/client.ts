import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import https from 'https';
import dns from 'dns';
import { ApodItem, ApodItemSchema } from './schemas/apod';
import { NearEarthObject, NearEarthObjectSchema } from './schemas/neows';
import { SolarFlare, SolarFlareSchema, CoronalMassEjection, CoronalMassEjectionSchema } from './schemas/donki';
import { EonetEvent, EonetEventSchema } from './schemas/eonet';

export interface NasaClientOptions {
  apiKey?: string;
  baseUrl?: string;
  eonetBaseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  initialRetryDelayMs?: number;
  logger?: {
    info: (msg: string, ...args: any[]) => void;
    warn: (msg: string, ...args: any[]) => void;
    error: (msg: string, ...args: any[]) => void;
  };
}

export class NasaClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly eonetBaseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly initialRetryDelayMs: number;
  private readonly logger: Required<NasaClientOptions>['logger'];
  private readonly http: AxiosInstance;

  constructor(options: NasaClientOptions = {}) {
    this.apiKey = options.apiKey || process.env.NASA_API_KEY || 'DEMO_KEY';
    this.baseUrl = options.baseUrl || 'https://api.nasa.gov';
    this.eonetBaseUrl = options.eonetBaseUrl || 'https://eonet.gsfc.nasa.gov/api/v3';
    this.timeoutMs = options.timeoutMs ?? 15000;
    this.maxRetries = options.maxRetries ?? 3;
    this.initialRetryDelayMs = options.initialRetryDelayMs ?? 1000;
    this.logger = options.logger || console;

    // IPv4 lookup fallback to prevent ENETUNREACH in environments without IPv6 routing
    const httpsAgent = new https.Agent({
      lookup: (hostname, lookupOptions, callback) => {
        if (typeof lookupOptions === 'function') {
          callback = lookupOptions;
          lookupOptions = { family: 4 };
        } else {
          lookupOptions = Object.assign({}, lookupOptions, { family: 4 });
        }
        dns.lookup(hostname, lookupOptions, callback);
      },
    });

    this.http = axios.create({
      timeout: this.timeoutMs,
      httpsAgent,
    });
  }

  /**
   * Internal request executor with exponential backoff, 429 rate limit handling, and timeouts.
   */
  public async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      try {
        return await this.http.request<T>(config);
      } catch (err: any) {
        attempt++;
        const status = err.response?.status;
        const isRateLimit = status === 429;
        const isServerOrNetworkError =
          !err.response || (status >= 500 && status < 600) || err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT';

        if (attempt > this.maxRetries || (!isRateLimit && !isServerOrNetworkError)) {
          this.logger.error(`[NasaClient] Request failed after ${attempt} attempt(s): ${err.message}`, {
            url: config.url,
            status,
          });
          throw err;
        }

        let delayMs = this.initialRetryDelayMs * Math.pow(2, attempt - 1);
        // Check for Retry-After header on 429 responses
        if (isRateLimit && err.response?.headers?.['retry-after']) {
          const retryAfterSec = parseInt(err.response.headers['retry-after'], 10);
          if (!isNaN(retryAfterSec) && retryAfterSec > 0) {
            delayMs = Math.min(retryAfterSec * 1000, 60000);
          }
        }

        // Add slight jitter
        delayMs += Math.floor(Math.random() * 200);

        this.logger.warn(
          `[NasaClient] Retry ${attempt}/${this.maxRetries} after ${delayMs}ms due to ${isRateLimit ? '429 Rate Limit' : err.message}`
        );

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw new Error(`[NasaClient] Max retries exceeded`);
  }

  /**
   * Helper to safely validate an array of items with a Zod schema.
   * Bad records are logged and skipped rather than throwing an exception.
   */
  private filterValidRecords<T>(records: any[], schema: { safeParse: (data: any) => { success: boolean; data?: T; error?: any } }, context: string): T[] {
    const valid: T[] = [];
    for (const record of records) {
      const parsed = schema.safeParse(record);
      if (parsed.success && parsed.data !== undefined) {
        valid.push(parsed.data);
      } else {
        this.logger.warn(`[NasaClient] Skipping invalid record in ${context}:`, parsed.error?.errors);
      }
    }
    return valid;
  }

  // --- APOD: Astronomy Picture of the Day ---
  public async getApod(params?: { date?: string; thumbs?: boolean }): Promise<ApodItem> {
    const response = await this.request<any>({
      method: 'GET',
      url: `${this.baseUrl}/planetary/apod`,
      params: {
        api_key: this.apiKey,
        ...params,
      },
    });

    const parsed = ApodItemSchema.safeParse(response.data);
    if (!parsed.success) {
      this.logger.warn('[NasaClient] APOD response did not strictly match schema, attempting fallback', parsed.error);
      if (response.data && typeof response.data === 'object' && response.data.url) {
        return {
          date: response.data.date || new Date().toISOString().slice(0, 10),
          title: response.data.title || 'Untitled',
          explanation: response.data.explanation || '',
          url: response.data.url,
          hdurl: response.data.hdurl || null,
          media_type: response.data.media_type || 'image',
          copyright: response.data.copyright || null,
          service_version: response.data.service_version || 'v1',
        };
      }
      throw new Error(`Invalid APOD response schema: ${parsed.error.message}`);
    }

    return parsed.data;
  }

  // --- NeoWs: Near Earth Objects Web Service ---
  public async getNeoWsFeed(startDate: string, endDate: string): Promise<{
    elementCount: number;
    asteroids: NearEarthObject[];
  }> {
    const response = await this.request<any>({
      method: 'GET',
      url: `${this.baseUrl}/neo/rest/v1/feed`,
      params: {
        api_key: this.apiKey,
        start_date: startDate,
        end_date: endDate,
      },
    });

    const rawFeed = response.data;
    const allAsteroids: NearEarthObject[] = [];

    if (rawFeed && typeof rawFeed === 'object' && rawFeed.near_earth_objects) {
      for (const dateKey of Object.keys(rawFeed.near_earth_objects)) {
        const list = rawFeed.near_earth_objects[dateKey];
        if (Array.isArray(list)) {
          const validAsteroids = this.filterValidRecords<NearEarthObject>(
            list,
            NearEarthObjectSchema,
            `NeoWs[${dateKey}]`
          );
          allAsteroids.push(...validAsteroids);
        }
      }
    }

    return {
      elementCount: rawFeed?.element_count ?? allAsteroids.length,
      asteroids: allAsteroids,
    };
  }

  public async getNeoWsAsteroid(asteroidId: string): Promise<NearEarthObject> {
    const response = await this.request<any>({
      method: 'GET',
      url: `${this.baseUrl}/neo/rest/v1/neo/${asteroidId}`,
      params: {
        api_key: this.apiKey,
      },
    });

    const parsed = NearEarthObjectSchema.safeParse(response.data);
    if (!parsed.success) {
      throw new Error(`Invalid NeoWs asteroid response: ${parsed.error.message}`);
    }
    return parsed.data;
  }

  // --- DONKI: Space Weather (Solar Flares FLR) ---
  public async getDonkiSolarFlares(startDate?: string, endDate?: string): Promise<SolarFlare[]> {
    const response = await this.request<any>({
      method: 'GET',
      url: `${this.baseUrl}/DONKI/FLR`,
      params: {
        api_key: this.apiKey,
        startDate,
        endDate,
      },
    });

    if (!Array.isArray(response.data)) {
      this.logger.warn('[NasaClient] DONKI FLR response is not an array', response.data);
      return [];
    }

    return this.filterValidRecords<SolarFlare>(response.data, SolarFlareSchema, 'DONKI_FLR');
  }

  // --- DONKI: Space Weather (Coronal Mass Ejections CME) ---
  public async getDonkiCmes(startDate?: string, endDate?: string): Promise<CoronalMassEjection[]> {
    const response = await this.request<any>({
      method: 'GET',
      url: `${this.baseUrl}/DONKI/CME`,
      params: {
        api_key: this.apiKey,
        startDate,
        endDate,
      },
    });

    if (!Array.isArray(response.data)) {
      this.logger.warn('[NasaClient] DONKI CME response is not an array', response.data);
      return [];
    }

    return this.filterValidRecords<CoronalMassEjection>(response.data, CoronalMassEjectionSchema, 'DONKI_CME');
  }

  // --- EONET: Earth Observatory Natural Event Tracker ---
  public async getEonetEvents(params?: {
    category?: string;
    days?: number;
    status?: 'open' | 'closed' | 'all';
    limit?: number;
  }): Promise<EonetEvent[]> {
    const response = await this.request<any>({
      method: 'GET',
      url: `${this.eonetBaseUrl}/events`,
      params,
    });

    const rawData = response.data;
    if (!rawData || !Array.isArray(rawData.events)) {
      this.logger.warn('[NasaClient] EONET response does not contain events array', rawData);
      return [];
    }

    return this.filterValidRecords<EonetEvent>(rawData.events, EonetEventSchema, 'EONET');
  }
}
