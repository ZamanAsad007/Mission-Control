import request from 'supertest';
import { createApp } from '../src/app';

jest.mock('../src/redis');

jest.mock('@mission-control/db', () => ({
  ...jest.requireActual('@mission-control/db'),
  getApodByDate: jest.fn().mockImplementation((date) => {
    if (date === '2000-05-15') {
      return Promise.resolve({
        date: '2000-05-15',
        title: 'M101: The Pinwheel Galaxy',
        explanation: 'A breathtaking spiral galaxy',
        url: 'https://apod.nasa.gov/apod/image/0005/m101_hst.jpg',
        media_type: 'image',
      });
    }
    return Promise.resolve(null);
  }),
  upsertApod: jest.fn().mockImplementation((apod) => Promise.resolve(apod)),
  getPool: jest.fn().mockReturnValue({
    query: jest.fn().mockImplementation((sql, _params) => {
      if (sql.includes('FROM events')) {
        return Promise.resolve({
          rows: [
            {
              id: 'evt-hist-1',
              category: 'wildfire',
              title: 'Historical Anniversary Event',
              started_at: '2020-05-15T00:00:00Z',
              severity: 'high',
            },
          ],
        });
      }
      if (sql.includes('FROM asteroids')) {
        return Promise.resolve({
          rows: [
            {
              id: 1,
              name: 'Anniversary NEO 2000',
              approach_date: '2000-05-15',
              hazardous: false,
              miss_distance_km: 3000000,
              velocity_kps: 18.2,
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    }),
  }),
}));

describe('GET /api/birthday', () => {
  const app = createApp();

  it('rejects missing date parameter with 400', async () => {
    const res = await request(app).get('/api/birthday');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('required');
  });

  it('rejects invalid date format with 400', async () => {
    const res = await request(app).get('/api/birthday?date=15-05-2000');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid date format');
  });

  it('rejects future dates with 400', async () => {
    const futureYear = new Date().getFullYear() + 5;
    const res = await request(app).get(`/api/birthday?date=${futureYear}-01-01`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('cannot be in the future');
  });

  it('returns APOD, EPIC, cosmic profile and anniversary events for valid birthday', async () => {
    const res = await request(app).get('/api/birthday?date=2000-05-15');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.date).toBe('2000-05-15');
    expect(data.apod).toBeDefined();
    expect(data.apod.title).toBe('M101: The Pinwheel Galaxy');

    expect(data.epic).toBeDefined();
    expect(data.epic.imageUrl).toBeDefined();

    expect(data.cosmicProfile).toBeDefined();
    expect(data.cosmicProfile.daysAlive).toBeGreaterThan(8000);
    expect(data.cosmicProfile.earthYears).toBeGreaterThan(20);
    expect(data.cosmicProfile.marsYears).toBeGreaterThan(10);
    expect(data.cosmicProfile.distanceAroundSunKm).toBeGreaterThan(100000000);

    expect(data.anniversaryEvents).toBeDefined();
    expect(data.anniversaryEvents.length).toBeGreaterThan(0);
    expect(data.anniversaryAsteroids).toBeDefined();
    expect(data.anniversaryAsteroids.length).toBeGreaterThan(0);
  });
});
