import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { getLastRuns, getPool } from '@mission-control/db';
import { IngestionScheduler } from './scheduler';

export function createApp(scheduler?: IngestionScheduler): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health endpoint: reports service status and last successful run per job
  app.get('/health', async (_req: Request, res: Response) => {
    try {
      const runs = await getLastRuns(getPool());
      res.json({
        success: true,
        service: 'ingestion-service',
        timestamp: new Date().toISOString(),
        jobs: runs,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        service: 'ingestion-service',
        error: err.message,
      });
    }
  });

  // Manual trigger endpoint
  app.post('/jobs/:name/trigger', async (req: Request, res: Response) => {
    const jobName = req.params.name;
    try {
      if (!scheduler) {
        return res.status(503).json({ success: false, error: 'Scheduler is not running' });
      }
      const job = await scheduler.triggerJob(jobName, req.body || {});
      res.status(202).json({
        success: true,
        message: `Job ${jobName} triggered`,
        jobId: job.id,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  });

  return app;
}
