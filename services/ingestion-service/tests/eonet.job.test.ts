import {
  extractPointCoordinates,
  getLatestGeometry,
  normalizeEonetEvent,
  runEonetJob,
} from '../src/jobs/eonet.job';
import * as db from '@mission-control/db';

jest.mock('@mission-control/db', () => ({
  ...jest.requireActual('@mission-control/db'),
  upsertEvents: jest.fn().mockResolvedValue({
    upsertedCount: 1,
    newEvents: [
      {
        id: 'new-eonet-1',
        source: 'EONET',
        source_id: 'EONET_1001',
        category: 'wildfires',
        title: 'Wildfire - Sierra Nevada',
        started_at: '2026-10-10T12:00:00Z',
        ended_at: null,
        latitude: 38.5,
        longitude: -120.5,
      },
    ],
  }),
  getPool: jest.fn().mockReturnValue({}),
}));

describe('EONET Ingestion Job', () => {
  describe('extractPointCoordinates', () => {
    it('should extract valid [longitude, latitude] coordinates', () => {
      const coords = [-122.4194, 37.7749];
      expect(extractPointCoordinates(coords)).toEqual([-122.4194, 37.7749]);
    });

    it('should extract first coordinate pair from nested polygon structure', () => {
      const polygonCoords = [
        [
          [-120.0, 38.0],
          [-120.1, 38.1],
          [-120.2, 38.2],
        ],
      ];
      expect(extractPointCoordinates(polygonCoords)).toEqual([-120.0, 38.0]);
    });

    it('should return null for invalid or out-of-range coordinates', () => {
      expect(extractPointCoordinates([])).toBeNull();
      expect(extractPointCoordinates([250, 100])).toBeNull();
      expect(extractPointCoordinates('invalid' as any)).toBeNull();
    });
  });

  describe('getLatestGeometry', () => {
    it('should return null for empty geometry array', () => {
      expect(getLatestGeometry([])).toBeNull();
    });

    it('should select the latest geometry by date for moving events (like storms)', () => {
      const geometries: any = [
        { date: '2026-10-15T00:00:00Z', type: 'Point', coordinates: [-70.0, 25.0] },
        { date: '2026-10-17T12:00:00Z', type: 'Point', coordinates: [-75.0, 30.0] },
        { date: '2026-10-16T06:00:00Z', type: 'Point', coordinates: [-72.5, 27.5] },
      ];

      const latest = getLatestGeometry(geometries);
      expect(latest).toBeDefined();
      expect(latest?.date).toBe('2026-10-17T12:00:00Z');
      expect(latest?.coordinates).toEqual([-75.0, 30.0]);
    });
  });

  describe('normalizeEonetEvent', () => {
    it('should normalize EonetEvent with latest coordinates and earliest started_at', () => {
      const rawEvent: any = {
        id: 'EONET_5500',
        title: 'Tropical Storm Delta',
        description: 'Atlantic tropical storm',
        closed: null,
        categories: [{ id: 'severeStorms', title: 'Severe Storms' }],
        geometry: [
          {
            date: '2026-10-14T00:00:00Z',
            type: 'Point',
            coordinates: [-65.0, 20.0],
            magnitudeValue: 45,
            magnitudeUnit: 'kts',
          },
          {
            date: '2026-10-16T12:00:00Z',
            type: 'Point',
            coordinates: [-70.0, 25.0],
            magnitudeValue: 65,
            magnitudeUnit: 'kts',
          },
        ],
      };

      const normalized = normalizeEonetEvent(rawEvent);
      expect(normalized.source).toBe('EONET');
      expect(normalized.source_id).toBe('EONET_5500');
      expect(normalized.category).toBe('severeStorms');
      expect(normalized.title).toBe('Tropical Storm Delta');
      expect(normalized.started_at).toBe('2026-10-14T00:00:00Z');
      expect(normalized.ended_at).toBeNull();
      // Latest geometry coordinates: [-70.0, 25.0] => lng: -70.0, lat: 25.0
      expect(normalized.longitude).toBe(-70.0);
      expect(normalized.latitude).toBe(25.0);
      expect(normalized.severity).toBe('65 kts');
    });

    it('should handle event with closed timestamp and no magnitude', () => {
      const rawEvent: any = {
        id: 'EONET_5501',
        title: 'Volcanic Eruption - Etna',
        closed: '2026-10-18T10:00:00Z',
        categories: [{ id: 'volcanoes', title: 'Volcanoes' }],
        geometry: [
          {
            date: '2026-10-17T08:00:00Z',
            type: 'Point',
            coordinates: [15.0, 37.7],
          },
        ],
      };

      const normalized = normalizeEonetEvent(rawEvent);
      expect(normalized.ended_at).toBe('2026-10-18T10:00:00Z');
      expect(normalized.severity).toBeNull();
      expect(normalized.longitude).toBe(15.0);
      expect(normalized.latitude).toBe(37.7);
    });
  });

  describe('runEonetJob', () => {
    it('should fetch events, upsert them, and publish new ones to Redis', async () => {
      const mockNasaClient: any = {
        getEonetEvents: jest.fn().mockResolvedValue([
          {
            id: 'EONET_1001',
            title: 'Wildfire - Sierra Nevada',
            categories: [{ id: 'wildfires', title: 'Wildfires' }],
            geometry: [
              {
                date: '2026-10-10T12:00:00Z',
                type: 'Point',
                coordinates: [-120.5, 38.5],
              },
            ],
          },
        ]),
      };

      const mockRedis: any = {
        publish: jest.fn().mockResolvedValue(1),
      };

      const result = await runEonetJob(mockNasaClient, {} as any, mockRedis, {
        days: 15,
        status: 'open',
      });

      expect(mockNasaClient.getEonetEvents).toHaveBeenCalledWith({
        days: 15,
        status: 'open',
      });
      expect(db.upsertEvents).toHaveBeenCalled();
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'event.created',
        expect.stringContaining('new-eonet-1')
      );
      expect(result.count).toBe(1);
      expect(result.newEventsCount).toBe(1);
    });
  });
});
