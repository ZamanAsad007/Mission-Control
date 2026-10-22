import { DbApod, getApodByDate, getLatestApod, upsertApod, getPool } from '@mission-control/db';
import { Pool } from 'pg';
import { config } from '../config';

export const FALLBACK_APOD = {
  date: new Date().toISOString().slice(0, 10),
  title: 'Cosmic Starfield & Deep Space Panorama',
  explanation:
    'On this day in cosmic history, deep space telescopes scanned distant nebulae and star clusters, capturing stellar nurseries light years away.',
  url: 'https://images-assets.nasa.gov/image/PIA12348/PIA12348~orig.jpg',
  hd_url: 'https://images-assets.nasa.gov/image/PIA12348/PIA12348~orig.jpg',
  media_type: 'image',
  copyright: 'NASA/JPL-Caltech',
};

export function isCorruptedApod(apod: Partial<DbApod> | null | undefined): boolean {
  if (!apod || !apod.url) return true;
  if (typeof apod.url === 'string' && apod.url.includes('nasa-logo')) return true;
  if (apod.title === 'NASA Science') return true;
  return false;
}

export async function fetchApodFromWordPress(date?: string): Promise<any | null> {
  let wpUrl = 'https://science.nasa.gov/wp-json/wp/v2/apod-basic?per_page=1';
  if (date) {
    const parts = date.split('-');
    if (parts.length === 3) {
      const yymmdd = parts[0].slice(-2) + parts[1] + parts[2];
      wpUrl = `https://science.nasa.gov/wp-json/wp/v2/apod-basic/${yymmdd}`;
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(wpUrl, { signal: controller.signal });
    if (!res.ok) return null;
    const data: any = await res.json();
    const item = Array.isArray(data) ? data[0] : data;
    if (!item || !item.title) return null;

    const mediaType = item.media_type || 'image';
    let displayUrl = item.hdurl || item.url;
    if (mediaType === 'video' && item.basic_html) {
      const m = item.basic_html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
      if (m && m[1]) {
        displayUrl = m[1].startsWith('//') ? `https:${m[1]}` : m[1];
      }
    }

    const cleanExp = item.explanation
      ? item.explanation
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/^(Explanation\s*[:\s]*)+/gi, '')
          .trim()
      : '';

    const cleanCopyright =
      item.copyright || item.credit
        ? (item.copyright || item.credit)
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        : null;

    return {
      date: item.date || date || new Date().toISOString().slice(0, 10),
      title: item.title,
      explanation: cleanExp,
      url: displayUrl,
      hd_url: item.hdurl || displayUrl || null,
      media_type: mediaType,
      copyright: cleanCopyright,
    };
  } catch (err: any) {
    console.warn(`[ApodService] WordPress APOD fetch failed for ${date || 'latest'}:`, err.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchApodFromPlanetary(date?: string): Promise<any | null> {
  const apiKey = config.nasaApiKey || 'DEMO_KEY';
  const url = date
    ? `https://api.nasa.gov/planetary/apod?date=${date}&api_key=${apiKey}`
    : `https://api.nasa.gov/planetary/apod?api_key=${apiKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const raw: any = await res.json();
    if (!raw || !raw.url || isCorruptedApod(raw)) return null;

    return {
      date: raw.date || date || new Date().toISOString().slice(0, 10),
      title: raw.title || 'Untitled',
      explanation: raw.explanation || '',
      url: raw.url,
      hd_url: raw.hdurl || raw.url,
      media_type: raw.media_type || 'image',
      copyright: raw.copyright || null,
    };
  } catch (err: any) {
    console.warn(`[ApodService] Planetary APOD fetch failed for ${date || 'latest'}:`, err.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function toDateString(d: any): string {
  if (!d) return '';
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

export async function resolveApod(date?: string, pool: Pool = getPool()): Promise<DbApod> {
  const targetDate = date || new Date().toISOString().slice(0, 10);

  // 1. Check if the requested date already exists in the database and is valid
  const apod: DbApod | null = await getApodByDate(targetDate, pool);
  if (apod && !isCorruptedApod(apod)) {
    return {
      ...apod,
      date: toDateString(apod.date),
    };
  }

  // 2. If missing or corrupted, fetch fresh from WordPress REST API (authoritative APOD source)
  let fresh = await fetchApodFromWordPress(date);

  // 3. If that fails, try planetary/apod
  if (!fresh) {
    fresh = await fetchApodFromPlanetary(date);
  }

  // 4. If we fetched a fresh valid record, upsert to database!
  if (fresh && !isCorruptedApod(fresh)) {
    try {
      const saved = await upsertApod(fresh, pool);
      try {
        const { invalidateCachePattern } = await import('../middleware/cache.middleware');
        await invalidateCachePattern('cache:apod:*');
      } catch {
        // Cache invalidation failure shouldn't block response
      }
      return {
        ...saved,
        date: toDateString(saved.date),
      };
    } catch (saveErr: any) {
      console.warn('[ApodService] Failed to upsert fresh APOD:', saveErr.message);
      return {
        ...fresh,
        date: toDateString(fresh.date),
        fetched_at: new Date(),
      };
    }
  }

  // 5. If fresh fetch failed (e.g. offline, rate limited, or date not published yet):
  // Fallback to the latest valid APOD in DB
  const latest = await getLatestApod(pool);
  if (latest && !isCorruptedApod(latest)) {
    return {
      ...latest,
      date: toDateString(latest.date),
    };
  }

  // 6. Ultimate fallback
  const fallback = {
    ...FALLBACK_APOD,
    date: targetDate,
    fetched_at: new Date(),
  };

  return fallback as DbApod;
}
