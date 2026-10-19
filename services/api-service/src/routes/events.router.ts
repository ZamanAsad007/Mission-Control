import { Router, Request, Response } from 'express';
import {
  getEvents,
  getEventsNearby,
  getEventById,
  getPool,
  EventFilter,
} from '@mission-control/db';
import { cacheMiddleware } from '../middleware/cache.middleware';

export const eventsRouter = Router();

// Cache events for 60 seconds
eventsRouter.use(cacheMiddleware(60, 'events'));

// GET /api/events/nearby?lat=&lng=&radiusKm=&limit=
eventsRouter.get('/nearby', async (req: Request, res: Response) => {
  try {
    const latStr = req.query.lat as string;
    const lngStr = req.query.lng as string;
    const radiusStr = (req.query.radiusKm as string) || '500';
    const limitStr = (req.query.limit as string) || '50';

    if (!latStr || !lngStr) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Missing required query parameters: lat and lng',
      });
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    const radiusKm = parseFloat(radiusStr);
    const limit = parseInt(limitStr, 10);

    if (isNaN(lat) || isNaN(lng) || isNaN(radiusKm) || isNaN(limit)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Invalid query parameters: lat, lng, radiusKm, and limit must be numeric',
      });
    }

    const pool = getPool();
    const events = await getEventsNearby(lat, lng, radiusKm, limit, pool);

    res.json({
      success: true,
      data: events,
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

// GET /api/events/:id
eventsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const event = await getEventById(id, pool);

    if (!event) {
      return res.status(404).json({
        success: false,
        data: null,
        error: `Event not found with ID ${id}`,
      });
    }

    res.json({
      success: true,
      data: event,
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

// GET /api/events?category=&from=&to=&bbox=&limit=&offset=
eventsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const filter: EventFilter = {};

    if (req.query.category) {
      filter.category = req.query.category as string;
    }
    if (req.query.source) {
      filter.source = req.query.source as string;
    }
    if (req.query.from) {
      filter.from = req.query.from as string;
    }
    if (req.query.to) {
      filter.to = req.query.to as string;
    }
    if (req.query.limit) {
      filter.limit = parseInt(req.query.limit as string, 10);
    }
    if (req.query.offset) {
      filter.offset = parseInt(req.query.offset as string, 10);
    }
    if (req.query.bbox) {
      const parts = (req.query.bbox as string).split(',').map((p) => parseFloat(p.trim()));
      if (parts.length === 4 && !parts.some(isNaN)) {
        filter.bbox = [parts[0], parts[1], parts[2], parts[3]];
      } else {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Invalid bbox format, expected minLng,minLat,maxLng,maxLat',
        });
      }
    }

    const pool = getPool();
    const events = await getEvents(filter, pool);

    res.json({
      success: true,
      data: events,
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
