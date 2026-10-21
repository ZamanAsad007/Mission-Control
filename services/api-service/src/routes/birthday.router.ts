import { Router, Request, Response } from 'express';
import { getPool } from '@mission-control/db';
import { cacheMiddleware } from '../middleware/cache.middleware';
import { config } from '../config';
import { resolveApod } from '../services/apod.service';

export const birthdayRouter = Router();

// Cache birthday responses for 24 hours (86400s)
birthdayRouter.use(cacheMiddleware(24 * 3600, 'birthday'));

const FALLBACK_EPIC = {
  date: '2026-10-18 12:00:00',
  caption: 'Earth as viewed by the NASA DSCOVR Earth Polychromatic Imaging Camera (EPIC)',
  imageUrl: 'https://epic.gsfc.nasa.gov/archive/natural/2024/01/01/png/epic_1b_20240101003633.png',
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
      const apiKey = config.nasaApiKey || 'DEMO_KEY';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      // Attempt exact date
      const response = await fetch(
        `https://api.nasa.gov/EPIC/api/natural/date/${date}?api_key=${apiKey}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (response.ok) {
        const items = (await response.json()) as any[];
        if (Array.isArray(items) && items.length > 0) {
          const item = items[0];
          const [y, m, d] = item.date.slice(0, 10).split('-');
          epicData = {
            date: item.date,
            caption: item.caption || 'DSCOVR EPIC Natural Color View of Earth',
            imageUrl: `https://epic.gsfc.nasa.gov/archive/natural/${y}/${m}/${d}/png/${item.image}.png`,
            coordinates: item.centroid_coordinates || null,
          };
        }
      }
    } catch (err: any) {
      console.warn(`[BirthdayRouter] EPIC fetch failed for ${date}:`, err.message);
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
