import { runApodJob } from '../src/jobs/apod.job';
import { runNeoWsJob, normalizeAsteroid } from '../src/jobs/neows.job';
import * as db from '@mission-control/db';

jest.mock('@mission-control/db', () => ({
  ...jest.requireActual('@mission-control/db'),
  upsertApod: jest.fn().mockResolvedValue({ date: '2026-10-18', title: 'Test APOD' }),
  upsertAsteroids: jest.fn().mockResolvedValue({ upsertedCount: 2 }),
  getPool: jest.fn().mockReturnValue({}),
}));

describe('Ingestion Jobs', () => {
  describe('normalizeAsteroid', () => {
    it('should correctly normalize NearEarthObject into DbAsteroid format', () => {
      const rawAsteroid: any = {
        id: '99999',
        name: 'Apollo 123',
        is_potentially_hazardous_asteroid: true,
        estimated_diameter: {
          meters: {
            estimated_diameter_min: 150.2,
            estimated_diameter_max: 335.8,
          },
        },
        close_approach_data: [
          {
            close_approach_date: '2026-10-22',
            miss_distance: { kilometers: '4500000.5' },
            relative_velocity: { kilometers_per_second: '22.4' },
          },
        ],
      };

      const normalized = normalizeAsteroid(rawAsteroid, '2026-10-22');
      expect(normalized.neo_id).toBe('99999');
      expect(normalized.name).toBe('Apollo 123');
      expect(normalized.approach_date).toBe('2026-10-22');
      expect(normalized.miss_distance_km).toBe(4500000.5);
      expect(normalized.velocity_kps).toBe(22.4);
      expect(normalized.hazardous).toBe(true);
      expect(normalized.diameter_min_m).toBe(150.2);
    });
  });

  describe('runApodJob', () => {
    it('should fetch APOD and upsert into database', async () => {
      const mockNasaClient: any = {
        getApod: jest.fn().mockResolvedValue({
          date: '2026-10-18',
          title: 'Deep Sky Wonders',
          explanation: 'Stars and gas',
          url: 'https://nasa.gov/image.jpg',
          media_type: 'image',
        }),
      };

      const result = await runApodJob(mockNasaClient, {} as any);
      expect(mockNasaClient.getApod).toHaveBeenCalled();
      expect(db.upsertApod).toHaveBeenCalledWith(
        expect.objectContaining({
          date: '2026-10-18',
          title: 'Deep Sky Wonders',
        }),
        expect.anything()
      );
      expect(result.count).toBe(1);
      expect(result.date).toBe('2026-10-18');
    });
  });

  describe('runNeoWsJob', () => {
    it('should fetch feed and upsert normalized asteroids', async () => {
      const mockNasaClient: any = {
        getNeoWsFeed: jest.fn().mockResolvedValue({
          elementCount: 2,
          asteroids: [
            {
              id: '101',
              name: 'Asteroid A',
              is_potentially_hazardous_asteroid: false,
              close_approach_data: [
                {
                  close_approach_date: '2026-10-19',
                  miss_distance: { kilometers: '2000000' },
                  relative_velocity: { kilometers_per_second: '12' },
                },
              ],
            },
            {
              id: '102',
              name: 'Asteroid B',
              is_potentially_hazardous_asteroid: true,
              close_approach_data: [
                {
                  close_approach_date: '2026-10-20',
                  miss_distance: { kilometers: '3000000' },
                  relative_velocity: { kilometers_per_second: '18' },
                },
              ],
            },
          ],
        }),
      };

      const result = await runNeoWsJob(mockNasaClient, {} as any, '2026-10-19', '2026-10-26');
      expect(mockNasaClient.getNeoWsFeed).toHaveBeenCalledWith('2026-10-19', '2026-10-26');
      expect(db.upsertAsteroids).toHaveBeenCalled();
      expect(result.count).toBe(2);
      expect(result.elementCount).toBe(2);
    });
  });
});
