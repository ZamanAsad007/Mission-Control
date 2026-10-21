import { Router, Request, Response } from 'express';
import { getPool } from '@mission-control/db';
import { cacheMiddleware } from '../middleware/cache.middleware';
import { resolveApod } from '../services/apod.service';

export const apodRouter = Router();

// GET /api/apod/today - Cache for 30 minutes
apodRouter.get('/today', cacheMiddleware(1800, 'apod'), async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    const apod = await resolveApod(undefined, pool);

    if (!apod) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'No APOD record found',
      });
    }

    res.json({
      success: true,
      data: apod,
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

// GET /api/apod?date=YYYY-MM-DD - Cache historical dates for 24 hours
apodRouter.get('/', cacheMiddleware(24 * 3600, 'apod'), async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string | undefined;
    const pool = getPool();

    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Invalid date format, expected YYYY-MM-DD',
      });
    }

    const apod = await resolveApod(date, pool);

    if (!apod) {
      return res.status(404).json({
        success: false,
        data: null,
        error: date ? `No APOD found for date ${date}` : 'No APOD record found',
      });
    }

    res.json({
      success: true,
      data: apod,
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
