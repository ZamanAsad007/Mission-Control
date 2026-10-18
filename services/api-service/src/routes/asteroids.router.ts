import { Router, Request, Response } from 'express';
import { getAsteroidsByDateRange, getPool } from '@mission-control/db';

export const asteroidsRouter = Router();

// GET /api/asteroids?from=YYYY-MM-DD&to=YYYY-MM-DD&hazardous=true|false
asteroidsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const fromStr = (req.query.from as string) || today.toISOString().slice(0, 10);
    const toStr =
      (req.query.to as string) ||
      new Date(new Date(fromStr).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromStr) || !/^\d{4}-\d{2}-\d{2}$/.test(toStr)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Invalid date format, expected YYYY-MM-DD',
      });
    }

    const hazardousOnly = req.query.hazardous === 'true';
    const pool = getPool();

    const asteroids = await getAsteroidsByDateRange(fromStr, toStr, hazardousOnly, pool);

    res.json({
      success: true,
      data: asteroids,
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
