import { upsertApod, getApodByDate } from '../src/repositories/apod.repository';
import { upsertAsteroids, getAsteroidsByDateRange } from '../src/repositories/asteroids.repository';
import { upsertEvents, getEventsNearby } from '../src/repositories/events.repository';
import {
  startIngestionRun,
  finishIngestionRun,
  getLastRuns,
} from '../src/repositories/runs.repository';

describe('Database Repositories (Unit with mock Pool)', () => {
  let mockClient: any;
  let mockPool: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockPool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient),
    };
  });

  describe('APOD Repository', () => {
    it('should upsert APOD and return row', async () => {
      const mockApod = {
        date: '2026-10-18',
        title: 'Eagle Nebula',
        explanation: 'Deep in space',
        url: 'https://nasa.gov/img.jpg',
        media_type: 'image',
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockApod] });

      const result = await upsertApod(mockApod, mockPool);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(result.title).toBe('Eagle Nebula');
    });

    it('should get APOD by date', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ date: '2026-10-18', title: 'Eagle Nebula' }],
      });

      const result = await getApodByDate('2026-10-18', mockPool);
      expect(result?.title).toBe('Eagle Nebula');
    });
  });

  describe('Asteroids Repository', () => {
    it('should upsert asteroids within transaction', async () => {
      const mockAsteroids = [
        {
          neo_id: '12345',
          name: 'Asteroid 1',
          approach_date: '2026-10-20',
          miss_distance_km: 1000000,
          velocity_kps: 15.5,
          hazardous: true,
        },
      ];

      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await upsertAsteroids(mockAsteroids, mockPool);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result.upsertedCount).toBe(1);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should query asteroids by date range with hazardous filter', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ neo_id: '12345', hazardous: true }],
      });

      const list = await getAsteroidsByDateRange('2026-10-18', '2026-10-25', true, mockPool);
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('hazardous = TRUE'), [
        '2026-10-18',
        '2026-10-25',
      ]);
      expect(list.length).toBe(1);
    });
  });

  describe('Events Repository', () => {
    it('should upsert events and detect newly inserted ones', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('INSERT INTO events')) {
          return Promise.resolve({
            rows: [
              {
                id: 'evt-uuid-1',
                source: 'DONKI_FLR',
                source_id: 'FLR-1',
                category: 'solar_flare',
                title: 'Class X flare',
                started_at: '2026-10-18T10:00:00Z',
                is_new: true,
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const events = [
        {
          source: 'DONKI_FLR' as const,
          source_id: 'FLR-1',
          category: 'solar_flare',
          title: 'Class X flare',
          started_at: '2026-10-18T10:00:00Z',
          latitude: 10,
          longitude: 20,
        },
      ];

      const result = await upsertEvents(events, mockPool);
      expect(result.upsertedCount).toBe(1);
      expect(result.newEvents.length).toBe(1);
      expect(result.newEvents[0].id).toBe('evt-uuid-1');
    });

    it('should query nearby events using ST_DWithin', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'evt-1', title: 'Nearby fire' }],
      });

      const nearby = await getEventsNearby(45.5, -122.6, 50, 10, mockPool);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ST_DWithin'),
        [-122.6, 45.5, 50000, 10]
      );
      expect(nearby.length).toBe(1);
    });
  });

  describe('Ingestion Runs Repository', () => {
    it('should track run start and finish', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'run-uuid-1' }] }).mockResolvedValueOnce({
        rows: [{ id: 'run-uuid-1', status: 'completed', records_upserted: 42 }],
      });

      const runId = await startIngestionRun('apod_job', mockPool);
      expect(runId).toBe('run-uuid-1');

      const finished = await finishIngestionRun(runId, 'completed', 42, null, mockPool);
      expect(finished.status).toBe('completed');
      expect(finished.records_upserted).toBe(42);
    });

    it('should get last run per job', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'run-1', job_name: 'apod_job', status: 'completed' }],
      });

      const runs = await getLastRuns(mockPool);
      expect(runs['apod_job']).toBeDefined();
      expect(runs['apod_job'].status).toBe('completed');
    });
  });
});
