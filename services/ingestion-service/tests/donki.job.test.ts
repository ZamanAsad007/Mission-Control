import { normalizeSolarFlare, normalizeCme, runDonkiJob } from '../src/jobs/donki.job';
import * as db from '@mission-control/db';

jest.mock('@mission-control/db', () => ({
  ...jest.requireActual('@mission-control/db'),
  upsertEvents: jest.fn().mockResolvedValue({
    upsertedCount: 2,
    newEvents: [
      {
        id: 'new-flare-1',
        source: 'DONKI_FLR',
        source_id: '2026-10-18T00:00:00-FLR-001',
        category: 'solar_flare',
        title: 'Solar Flare (X1.5)',
        severity: 'X1.5',
        started_at: '2026-10-18T00:00:00Z',
        ended_at: '2026-10-18T01:00:00Z',
        payload: {},
      },
    ],
  }),
  getPool: jest.fn().mockReturnValue({}),
}));

describe('DONKI Ingestion Job', () => {
  describe('normalizeSolarFlare', () => {
    it('should correctly normalize SolarFlare into DbEvent format with parsed flare class', () => {
      const rawFlare: any = {
        flrID: '2026-10-18T00:00:00-FLR-001',
        instruments: [{ displayName: 'GOES-16' }],
        beginTime: '2026-10-18T00:10:00Z',
        peakTime: '2026-10-18T00:25:00Z',
        endTime: '2026-10-18T00:40:00Z',
        classType: 'M5.4',
        sourceLocation: 'N15W30',
        activeRegionNum: 13800,
      };

      const normalized = normalizeSolarFlare(rawFlare);
      expect(normalized.source).toBe('DONKI_FLR');
      expect(normalized.source_id).toBe('2026-10-18T00:00:00-FLR-001');
      expect(normalized.category).toBe('solar_flare');
      expect(normalized.title).toBe('Solar Flare (M5.4)');
      expect(normalized.severity).toBe('M5.4');
      expect(normalized.started_at).toBe('2026-10-18T00:10:00Z');
      expect(normalized.ended_at).toBe('2026-10-18T00:40:00Z');
      expect(normalized.latitude).toBeNull();
      expect(normalized.longitude).toBeNull();
      expect(normalized.payload).toBe(rawFlare);
    });

    it('should handle SolarFlare without classType gracefully', () => {
      const rawFlare: any = {
        flrID: '2026-10-18T02:00:00-FLR-002',
        beginTime: '2026-10-18T02:00:00Z',
      };

      const normalized = normalizeSolarFlare(rawFlare);
      expect(normalized.severity).toBeNull();
      expect(normalized.title).toBe('Solar Flare (2026-10-18T02:00:00-FLR-002)');
    });
  });

  describe('normalizeCme', () => {
    it('should correctly normalize CoronalMassEjection into DbEvent format with speed severity', () => {
      const rawCme: any = {
        activityID: '2026-10-18T05:00:00-CME-001',
        startTime: '2026-10-18T05:30:00Z',
        sourceLocation: 'S20E45',
        cmeAnalyses: [
          {
            isMostAccurate: true,
            speed: 1250,
            type: 'C',
          },
        ],
      };

      const normalized = normalizeCme(rawCme);
      expect(normalized.source).toBe('DONKI_CME');
      expect(normalized.source_id).toBe('2026-10-18T05:00:00-CME-001');
      expect(normalized.category).toBe('cme');
      expect(normalized.title).toBe('Coronal Mass Ejection (2026-10-18T05:00:00-CME-001)');
      expect(normalized.severity).toBe('1250 km/s');
      expect(normalized.started_at).toBe('2026-10-18T05:30:00Z');
      expect(normalized.ended_at).toBeNull();
      expect(normalized.latitude).toBeNull();
      expect(normalized.longitude).toBeNull();
    });

    it('should fallback to analysis type when speed is null', () => {
      const rawCme: any = {
        activityID: '2026-10-18T08:00:00-CME-002',
        startTime: '2026-10-18T08:00:00Z',
        cmeAnalyses: [
          {
            isMostAccurate: false,
            speed: null,
            type: 'S',
          },
        ],
      };

      const normalized = normalizeCme(rawCme);
      expect(normalized.severity).toBe('S');
    });
  });

  describe('runDonkiJob', () => {
    it('should fetch flares & CMEs, upsert events, and publish new events to Redis', async () => {
      const mockNasaClient: any = {
        getDonkiSolarFlares: jest.fn().mockResolvedValue([
          {
            flrID: '2026-10-18T00:00:00-FLR-001',
            beginTime: '2026-10-18T00:00:00Z',
            classType: 'X1.5',
          },
        ]),
        getDonkiCmes: jest.fn().mockResolvedValue([
          {
            activityID: '2026-10-18T05:00:00-CME-001',
            startTime: '2026-10-18T05:00:00Z',
            cmeAnalyses: [{ speed: 900 }],
          },
        ]),
      };

      const mockRedis: any = {
        publish: jest.fn().mockResolvedValue(1),
      };

      const result = await runDonkiJob(mockNasaClient, {} as any, mockRedis, {
        startDate: '2026-10-01',
        endDate: '2026-10-18',
      });

      expect(mockNasaClient.getDonkiSolarFlares).toHaveBeenCalledWith('2026-10-01', '2026-10-18');
      expect(mockNasaClient.getDonkiCmes).toHaveBeenCalledWith('2026-10-01', '2026-10-18');
      expect(db.upsertEvents).toHaveBeenCalled();
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'event.created',
        expect.stringContaining('new-flare-1')
      );
      expect(result.count).toBe(2);
      expect(result.flaresCount).toBe(1);
      expect(result.cmesCount).toBe(1);
      expect(result.newEventsCount).toBe(1);
    });
  });
});
