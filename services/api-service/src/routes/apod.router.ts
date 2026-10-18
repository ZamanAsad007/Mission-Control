import { Router, Request, Response } from 'express';
import { getApodByDate, getLatestApod, getPool } from '@mission-control/db';

export const apodRouter = Router();

// GET /api/apod/today
apodRouter.get('/today', async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const pool = getPool();
    let apod = await getApodByDate(today, pool);
    if (!apod) {
      apod = await getLatestApod(pool);
    }

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

// GET /api/apod?date=YYYY-MM-DD
apodRouter.get('/', async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string | undefined;
    const pool = getPool();

    let apod;
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Invalid date format, expected YYYY-MM-DD',
        });
      }
      apod = await getApodByDate(date, pool);
    } else {
      const today = new Date().toISOString().slice(0, 10);
      apod = await getApodByDate(today, pool);
      if (!apod) {
        apod = await getLatestApod(pool);
      }
    }

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
