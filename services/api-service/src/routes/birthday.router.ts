import { Router, Request, Response } from 'express';
import https from 'https';
import { getPool } from '@mission-control/db';
import { cacheMiddleware } from '../middleware/cache.middleware';
import { config } from '../config';
import { resolveApod } from '../services/apod.service';

export const birthdayRouter = Router();

// Cache birthday responses for 24 hours (86400s)
birthdayRouter.use(cacheMiddleware(24 * 3600, 'birthday'));

function fetchJsonWithHttps<T = any>(url: string, timeoutMs = 5000): Promise<T | null> {
  return new Promise((resolve) => {
    const req = https.get(url, { family: 4, timeout: timeoutMs }, (res) => {
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return resolve(null);
      }
      let raw = '';
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve(null);
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.on('error', () => {
      resolve(null);
    });
  });
}

const FALLBACK_EPIC = {
  date: '2024-01-01 00:50:27',
  caption:
    'Full-disc sunlit view of Earth captured by NASA DSCOVR Earth Polychromatic Imaging Camera (EPIC) from Lagrange Point 1 (1,000,000 miles away).',
  imageUrl: 'https://epic.gsfc.nasa.gov/archive/natural/2024/01/01/jpg/epic_1b_20240101005515.jpg',
  coordinates: { lat: 0, lon: 0 },
};

birthdayRouter.get('/', async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string | undefined;

    if (!date) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Query parameter "date" (YYYY-MM-DD) is required',
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Invalid date format, expected YYYY-MM-DD',
      });
    }

    const birthDate = new Date(`${date}T00:00:00Z`);
    const now = new Date();

    if (isNaN(birthDate.getTime())) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Invalid calendar date provided',
      });
    }

    if (birthDate.getTime() > now.getTime()) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Birth date cannot be in the future',
      });
    }

    const pool = getPool();

    // 1. Resolve APOD
    const apodData = await resolveApod(date, pool);
    if (apodData && apodData.date) {
      apodData.date = String(apodData.date).slice(0, 10);
    }

    // 2. Resolve EPIC Earth Imagery
    let epicData = null;
    try {
      let items: any[] | null = null;

      // 1) If date is after DSCOVR first science observations (June 2015), attempt exact date
      if (date >= '2015-06-13') {
        items = await fetchJsonWithHttps<any[]>(`https://epic.gsfc.nasa.gov/api/natural/date/${date}`, 4000);
      }

      // 2) If no images for exact date (e.g. before 2015 or satellite was in calibration),
      // match the birthday's calendar month & day across recent active mission years
      if (!items || items.length === 0) {
        const monthDay = date.slice(5); // "MM-DD"
        for (const year of ['2024', '2023', '2022', '2021']) {
          items = await fetchJsonWithHttps<any[]>(
            `https://epic.gsfc.nasa.gov/api/natural/date/${year}-${monthDay}`,
            3000
          );
          if (items && items.length > 0) break;
        }
      }

      // 3) Fallback to the latest available EPIC natural Earth disc observation
      if (!items || items.length === 0) {
        items = await fetchJsonWithHttps<any[]>('https://epic.gsfc.nasa.gov/api/natural', 4000);
      }

      if (Array.isArray(items) && items.length > 0) {
        const item = items[0];
        const [y, m, d] = item.date.slice(0, 10).split('-');
        const isExact = item.date.slice(0, 10) === date;
        epicData = {
          date: item.date,
          caption: isExact
            ? item.caption || 'DSCOVR EPIC Natural Color View of Earth'
            : date < '2015-06-13'
            ? `DSCOVR began operations in 2015. Shown here is Earth as viewed on your birthday date (${date.slice(5)}) by NASA's DSCOVR EPIC observatory from Lagrange Point 1.`
            : `DSCOVR EPIC natural color observation of planet Earth for calendar date ${date.slice(5)}.`,
          imageUrl: `https://epic.gsfc.nasa.gov/archive/natural/${y}/${m}/${d}/jpg/${item.image}.jpg`,
          coordinates: item.centroid_coordinates || null,
        };
      }
    } catch (err: any) {
      console.warn(`[BirthdayRouter] EPIC fetch warning for ${date}:`, err.message);
    }

    if (!epicData) {
      epicData = FALLBACK_EPIC;
    }

    // 3. Compute Planetary Ages & Cosmic Travel Distance
    const diffMs = Math.max(0, now.getTime() - birthDate.getTime());
    const daysAlive = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const earthYears = +(daysAlive / 365.2422).toFixed(2);
    const mercuryYears = +(daysAlive / 87.969).toFixed(1);
    const venusYears = +(daysAlive / 224.701).toFixed(1);
    const marsYears = +(daysAlive / 686.98).toFixed(2);
    const jupiterYears = +(daysAlive / 4332.589).toFixed(2);
    const saturnYears = +(daysAlive / 10759.22).toFixed(2);
    // Earth orbits the sun at ~107,226 km/h (~2,573,424 km per day)
    const distanceAroundSunKm = Math.round(daysAlive * 2573424);

    // 4. Query Anniversary Events & Asteroids in database
    const monthDay = date.slice(5); // "MM-DD"
    let anniversaryEvents: any[] = [];
    let anniversaryAsteroids: any[] = [];

    try {
      const eventsRes = await pool.query(
        `SELECT id, category, title, started_at, severity, location
         FROM events
         WHERE TO_CHAR(started_at, 'MM-DD') = $1
         ORDER BY started_at DESC
         LIMIT 5`,
        [monthDay]
      );
      anniversaryEvents = eventsRes.rows;

      const asteroidsRes = await pool.query(
        `SELECT neo_id, name, approach_date, hazardous, miss_distance_km, velocity_kps
         FROM asteroids
         WHERE TO_CHAR(approach_date, 'MM-DD') = $1
         ORDER BY approach_date DESC
         LIMIT 5`,
        [monthDay]
      );
      anniversaryAsteroids = asteroidsRes.rows;
    } catch (dbErr: any) {
      console.warn('[BirthdayRouter] Database anniversary lookup warning:', dbErr.message);
    }

    res.json({
      success: true,
      data: {
        date,
        apod: apodData,
        epic: epicData,
        cosmicProfile: {
          daysAlive,
          earthYears,
          mercuryYears,
          venusYears,
          marsYears,
          jupiterYears,
          saturnYears,
          distanceAroundSunKm,
        },
        anniversaryEvents,
        anniversaryAsteroids,
      },
      error: null,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      data: null,
      error: err.message,
    });
  }
});
