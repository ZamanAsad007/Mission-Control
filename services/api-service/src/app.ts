import express, { Express } from 'express';
import cors from 'cors';
import { apodRouter } from './routes/apod.router';
import { asteroidsRouter } from './routes/asteroids.router';
import { eventsRouter } from './routes/events.router';
import { statsRouter } from './routes/stats.router';
import { healthRouter } from './routes/health.router';

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Mount API routes under /api
  app.use('/api/apod', apodRouter);
  app.use('/api/asteroids', asteroidsRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/health', healthRouter);

  // Also support direct paths without /api prefix
  app.use('/apod', apodRouter);
  app.use('/asteroids', asteroidsRouter);
  app.use('/events', eventsRouter);
  app.use('/stats', statsRouter);
  app.use('/health', healthRouter);

  return app;
}
