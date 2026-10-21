import { isCorruptedApod, resolveApod, FALLBACK_APOD } from '../src/services/apod.service';
import * as db from '@mission-control/db';

jest.mock('../src/redis');
jest.mock('@mission-control/db', () => ({
  getApodByDate: jest.fn(),
  getLatestApod: jest.fn(),
  upsertApod: jest.fn((apod) => Promise.resolve({ ...apod, id: 1, fetched_at: new Date() })),
  getPool: jest.fn().mockReturnValue({}),
}));

describe('APOD Service Helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isCorruptedApod', () => {
    it('returns true for null or undefined', () => {
      expect(isCorruptedApod(null)).toBe(true);
      expect(isCorruptedApod(undefined)).toBe(true);
    });

    it('returns true when url contains nasa-logo', () => {
      expect(
        isCorruptedApod({
          title: 'Some title',
          url: 'https://science.nasa.gov/wp-content/themes/nasa-child/assets/images/nasa-logo@2x.png',
        })
      ).toBe(true);
    });

    it('returns true when title is "NASA Science"', () => {
      expect(
        isCorruptedApod({
          title: 'NASA Science',
          url: 'https://example.com/valid.jpg',
        })
      ).toBe(true);
    });

    it('returns false for authentic APOD item', () => {
      expect(
        isCorruptedApod({
          title: 'M101: The Pinwheel Galaxy',
          url: 'https://apod.nasa.gov/apod/image/0005/m101_hst.jpg',
        })
      ).toBe(false);
    });
  });

  describe('resolveApod', () => {
    it('returns cached valid record directly from database', async () => {
      const validDbApod = {
        id: 1,
        date: '2026-10-18',
        title: 'Galaxy Andromeda',
        explanation: 'A great spiral galaxy',
        url: 'https://assets.science.nasa.gov/dynamicimage/andromeda.jpg',
        hd_url: 'https://assets.science.nasa.gov/dynamicimage/andromeda.jpg',
        media_type: 'image',
        copyright: 'NASA',
        fetched_at: new Date(),
      };

      (db.getApodByDate as jest.Mock).mockResolvedValue(validDbApod);

      const result = await resolveApod('2026-10-18', {} as any);
      expect(result.title).toBe('Galaxy Andromeda');
      expect(result.url).toBe(validDbApod.url);
      expect(db.upsertApod).not.toHaveBeenCalled();
    });

    it('falls back to FALLBACK_APOD if record is corrupted and network fails', async () => {
      (db.getApodByDate as jest.Mock).mockResolvedValue({
        id: 2,
        date: '2026-10-19',
        title: 'NASA Science',
        url: 'https://science.nasa.gov/wp-content/themes/nasa-child/assets/images/nasa-logo@2x.png',
      });
      (db.getLatestApod as jest.Mock).mockResolvedValue(null);

      // Mock global fetch to fail
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      try {
        const result = await resolveApod('2026-10-19', {} as any);
        expect(result.title).toBe(FALLBACK_APOD.title);
        expect(result.url).toBe(FALLBACK_APOD.url);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('fetches fresh APOD from network when date is missing from DB instead of returning stale latest DB record', async () => {
      // DB has no record for today (2026-10-21), but has older record (2026-10-19)
      (db.getApodByDate as jest.Mock).mockResolvedValue(null);
      (db.getLatestApod as jest.Mock).mockResolvedValue({
        id: 1,
        date: '2026-10-19',
        title: 'Old APOD from 2 days ago',
        url: 'https://example.com/old.jpg',
      });

      const freshApod = {
        date: '2026-10-21',
        title: 'New Ghosts Revealed in Cassiopeia',
        explanation: 'Faint nebulas in Cassiopeia',
        url: 'https://example.com/cassiopeia.jpg',
        hdurl: 'https://example.com/cassiopeia-hd.jpg',
        media_type: 'image',
      };

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [freshApod],
      } as any);

      try {
        const result = await resolveApod('2026-10-21', {} as any);
        expect(result.title).toBe('New Ghosts Revealed in Cassiopeia');
        expect(result.date).toBe('2026-10-21');
        expect(db.upsertApod).toHaveBeenCalled();
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('normalizes Date objects or full ISO strings to YYYY-MM-DD date string', async () => {
      (db.getApodByDate as jest.Mock).mockResolvedValue({
        id: 1,
        date: '2012-08-06T00:00:00.000Z',
        title: 'Curiosity Rover Landing',
        url: 'https://example.com/curiosity.jpg',
      });

      const result = await resolveApod('2012-08-06', {} as any);
      expect(result.date).toBe('2012-08-06');
    });
  });
});
