import { Router, Request, Response } from 'express';
import { getSpaceWeatherStats, getPool } from '@mission-control/db';

export const statsRouter = Router();

// GET /api/stats/space-weather?days=
statsRouter.get('/space-weather', async (req: Request, res: Response) => {
  try {
    const daysStr = (req.query.days as string) || '30';
    const days = parseInt(daysStr, 10);

    if (isNaN(days) || days <= 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Query parameter days must be a positive integer',
      });
    }

    const pool = getPool();
    const stats = await getSpaceWeatherStats(days, pool);

    res.json({
      success: true,
      data: stats,
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
