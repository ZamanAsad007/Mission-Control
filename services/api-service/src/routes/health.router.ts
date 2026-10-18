import { Router, Request, Response } from 'express';
import { getLastRuns, getPool } from '@mission-control/db';

export const healthRouter = Router();

// GET /api/health
healthRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const runs = await getLastRuns(getPool());
    res.json({
      success: true,
      service: 'api-service',
      timestamp: new Date().toISOString(),
      jobs: runs,
      error: null,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      service: 'api-service',
      timestamp: new Date().toISOString(),
      jobs: null,
      error: err.message,
    });
  }
});
