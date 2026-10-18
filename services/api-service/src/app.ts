import express, { Express } from 'express';
import cors from 'cors';
import { createRateLimiter } from './middleware/rate-limit.middleware';
import { apodRouter } from './routes/apod.router';
import { asteroidsRouter } from './routes/asteroids.router';
import { eventsRouter } from './routes/events.router';
import { statsRouter } from './routes/stats.router';
import { healthRouter } from './routes/health.router';
import { streamRouter } from './routes/stream.router';
import { authRouter } from './routes/auth.router';
import { swaggerUiServe, swaggerUiSetup, swaggerSpec } from './docs/swagger';

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Global rate limiter (100 requests per 15 minutes)
  const limiter = createRateLimiter();
  app.use(limiter);

  // OpenAPI Swagger Documentation at /api/docs and /docs
  app.use('/api/docs', swaggerUiServe, swaggerUiSetup);
  app.use('/docs', swaggerUiServe, swaggerUiSetup);
  app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

  // Mount API routes under /api
  app.use('/api/apod', apodRouter);
  app.use('/api/asteroids', asteroidsRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/stream', streamRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/health', healthRouter);

  // Also support direct paths without /api prefix
  app.use('/apod', apodRouter);
  app.use('/asteroids', asteroidsRouter);
  app.use('/events', eventsRouter);
  app.use('/stats', statsRouter);
  app.use('/stream', streamRouter);
  app.use('/auth', authRouter);
  app.use('/health', healthRouter);

  return app;
}
