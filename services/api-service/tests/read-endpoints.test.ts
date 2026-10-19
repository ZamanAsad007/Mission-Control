import request from 'supertest';
import { createApp } from '../src/app';

jest.mock('../src/redis');

jest.mock('@mission-control/db', () => ({
  ...jest.requireActual('@mission-control/db'),
  getApodByDate: jest.fn().mockImplementation((date) => {
    if (date === '2026-10-18') {
      return Promise.resolve({
        date: '2026-10-18',
        title: 'Galaxy Andromeda',
        explanation: 'A great spiral galaxy',
        url: 'https://nasa.gov/apod.jpg',
      });
    }
    return Promise.resolve(null);
  }),
  getLatestApod: jest.fn().mockResolvedValue({
    date: '2026-10-18',
    title: 'Galaxy Andromeda',
    explanation: 'A great spiral galaxy',
    url: 'https://nasa.gov/apod.jpg',
  }),
  getAsteroidsByDateRange: jest.fn().mockResolvedValue([
    {
      neo_id: '9999',
      name: 'Asteroid 9999',
      approach_date: '2026-10-20',
      miss_distance_km: 1200000,
      velocity_kps: 15.5,
      hazardous: true,
    },
  ]),
  getEvents: jest.fn().mockResolvedValue([
    {
      id: 'evt-100',
      source: 'DONKI_FLR',
      source_id: 'FLR-100',
      category: 'solar_flare',
      title: 'Solar Flare M2.0',
      started_at: '2026-10-18T10:00:00Z',
    },
  ]),
  getEventById: jest.fn().mockImplementation((id) => {
    if (id === 'evt-100') {
      return Promise.resolve({
        id: 'evt-100',
        source: 'DONKI_FLR',
        source_id: 'FLR-100',
        category: 'solar_flare',
        title: 'Solar Flare M2.0',
        started_at: '2026-10-18T10:00:00Z',
      });
    }
    return Promise.resolve(null);
  }),
  getEventsNearby: jest.fn().mockResolvedValue([
    {
      id: 'evt-200',
      source: 'EONET',
      category: 'wildfires',
      title: 'Nearby Wildfire',
      latitude: 37.77,
      longitude: -122.41,
    },
  ]),
  getSpaceWeatherStats: jest.fn().mockResolvedValue([
    {
      date: '2026-10-18',
      c_class: 0,
      m_class: 1,
      x_class: 0,
      total_flares: 1,
      cme_count: 0,
    },
  ]),
  getLastRuns: jest.fn().mockResolvedValue({
    apod_job: { status: 'completed' },
  }),
  getPool: jest.fn().mockReturnValue({}),
}));

describe('API Service Read Endpoints', () => {
  const app = createApp();

  describe('APOD Endpoints', () => {
    it('GET /api/apod/today should return 200 with today APOD', async () => {
      const res = await request(app).get('/api/apod/today');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Galaxy Andromeda');
    });

    it('GET /api/apod?date=2026-10-18 should return APOD for that date', async () => {
      const res = await request(app).get('/api/apod?date=2026-10-18');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.date).toBe('2026-10-18');
    });

    it('GET /api/apod?date=invalid should return 400', async () => {
      const res = await request(app).get('/api/apod?date=invalid-date');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Asteroids Endpoints', () => {
    it('GET /api/asteroids should return list of asteroids', async () => {
      const res = await request(app).get(
        '/api/asteroids?from=2026-10-18&to=2026-10-25&hazardous=true'
      );
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].neo_id).toBe('9999');
    });
  });

  describe('Events Endpoints', () => {
    it('GET /api/events should return filtered events', async () => {
      const res = await request(app).get('/api/events?category=solar_flare&limit=10');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].category).toBe('solar_flare');
    });

    it('GET /api/events/:id should return event detail', async () => {
      const res = await request(app).get('/api/events/evt-100');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('evt-100');
    });

    it('GET /api/events/:id should return 404 for unknown ID', async () => {
      const res = await request(app).get('/api/events/unknown-id');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/events/nearby should return nearby events for valid coordinates', async () => {
      const res = await request(app).get('/api/events/nearby?lat=37.77&lng=-122.41&radiusKm=50');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].title).toBe('Nearby Wildfire');
    });

    it('GET /api/events/nearby should return 400 if lat or lng missing', async () => {
      const res = await request(app).get('/api/events/nearby?lat=37.77');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Space Weather Stats Endpoint', () => {
    it('GET /api/stats/space-weather should return flare statistics', async () => {
      const res = await request(app).get('/api/stats/space-weather?days=14');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].m_class).toBe(1);
      expect(res.body.data[0].total_flares).toBe(1);
    });
  });

  describe('Health Endpoint', () => {
    it('GET /api/health should return 200 with service health and job status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.service).toBe('api-service');
      expect(res.body.jobs.apod_job).toBeDefined();
    });
  });

  describe('Swagger Documentation', () => {
    it('GET /api/docs.json should return OpenAPI specification', async () => {
      const res = await request(app).get('/api/docs.json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.0');
      expect(res.body.info.title).toBe('Mission Control API');
      expect(res.body.paths['/apod/today']).toBeDefined();
    });
  });
});
