import { AlertEngine } from '../src/engine';
import { formatAlertDateTime } from '../src/utils';
import * as db from '@mission-control/db';
import * as notifiersModule from '../src/notifiers';

jest.mock('@mission-control/db');
jest.mock('../src/notifiers');

describe('formatAlertDateTime utility', () => {
  it('formats ISO timestamps into human-readable UTC strings', () => {
    expect(formatAlertDateTime('2026-10-20T00:00:00.000Z')).toBe('Oct 20, 2026, 00:00 UTC');
    expect(formatAlertDateTime('2026-10-18T14:32:00Z')).toBe('Oct 18, 2026, 14:32 UTC');
    expect(formatAlertDateTime('2026-10-18T14:32:45Z')).toBe('Oct 18, 2026, 14:32:45 UTC');
  });

  it('formats Date objects properly', () => {
    const d = new Date('2026-10-20T00:00:00.000Z');
    expect(formatAlertDateTime(d)).toBe('Oct 20, 2026, 00:00 UTC');
  });

  it('formats date-only strings without unwanted 00:00 time', () => {
    expect(formatAlertDateTime('2026-10-25')).toBe('Oct 25, 2026');
  });

  it('handles null, undefined and invalid strings safely', () => {
    expect(formatAlertDateTime(null)).toBe('N/A');
    expect(formatAlertDateTime(undefined)).toBe('N/A');
    expect(formatAlertDateTime('invalid-date')).toBe('invalid-date');
  });
});

describe('AlertEngine Processing, Cooldown & Retry', () => {
  let mockPool: any;
  let mockNotifier: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = {};

    mockNotifier = {
      channel: 'telegram',
      send: jest.fn().mockResolvedValue({ success: true }),
    };

    (notifiersModule.getNotifier as jest.Mock).mockReturnValue(mockNotifier);
  });

  describe('sendWithRetry', () => {
    it('should succeed immediately if notifier succeeds', async () => {
      const engine = new AlertEngine({ pool: mockPool, maxRetries: 3, initialBackoffMs: 10 });
      const result = await engine.sendWithRetry(mockNotifier, {
        recipient: '123',
        title: 'Test',
        body: 'Body',
      });

      expect(result.success).toBe(true);
      expect(mockNotifier.send).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed if subsequent attempt succeeds', async () => {
      mockNotifier.send
        .mockResolvedValueOnce({ success: false, error: 'Temporary timeout' })
        .mockResolvedValueOnce({ success: true });

      const engine = new AlertEngine({ pool: mockPool, maxRetries: 3, initialBackoffMs: 10 });
      const result = await engine.sendWithRetry(mockNotifier, {
        recipient: '123',
        title: 'Test',
        body: 'Body',
      });

      expect(result.success).toBe(true);
      expect(mockNotifier.send).toHaveBeenCalledTimes(2);
    });

    it('should return failure if all retry attempts fail', async () => {
      mockNotifier.send.mockResolvedValue({ success: false, error: 'Persistent error' });

      const engine = new AlertEngine({ pool: mockPool, maxRetries: 3, initialBackoffMs: 10 });
      const result = await engine.sendWithRetry(mockNotifier, {
        recipient: '123',
        title: 'Test',
        body: 'Body',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Persistent error');
      expect(mockNotifier.send).toHaveBeenCalledTimes(3);
    });
  });

  describe('Cooldown and Deduplication', () => {
    const mockRule = {
      id: 'rule-flare-1',
      user_id: 'user-1',
      name: 'Major Solar Flares',
      type: 'solar_flare',
      config: { minClass: 'M5' },
      channels: ['telegram'],
      cooldown_minutes: 60,
      active: true,
      telegram_chat_id: 'chat-100',
      user_email: 'user@example.com',
    };

    const mockEvent: any = {
      id: 'evt-flare-1',
      source: 'DONKI_FLR',
      source_id: 'FLR-1',
      category: 'solar_flare',
      title: 'Solar Flare M7.0',
      severity: 'M7.0',
      started_at: '2026-10-18T12:00:00Z',
    };

    it('should deliver alert when not in cooldown and not already delivered', async () => {
      (db.getActiveRules as jest.Mock).mockResolvedValue([mockRule]);
      (db.isWithinCooldown as jest.Mock).mockResolvedValue(false);
      (db.isAlreadyDelivered as jest.Mock).mockResolvedValue(false);
      (db.createDelivery as jest.Mock).mockResolvedValue({ id: 'del-1' });

      const engine = new AlertEngine({ pool: mockPool, maxRetries: 1 });
      const count = await engine.processEvent(mockEvent);

      expect(count).toBe(1);
      expect(mockNotifier.send).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: 'chat-100',
          body: expect.stringContaining('Started at: Oct 18, 2026, 12:00 UTC'),
        })
      );
      expect(db.createDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          rule_id: 'rule-flare-1',
          event_ref: 'evt-flare-1',
          channel: 'telegram',
          status: 'sent',
        }),
        mockPool
      );
    });

    it('should skip delivery when rule is in cooldown', async () => {
      (db.getActiveRules as jest.Mock).mockResolvedValue([mockRule]);
      (db.isWithinCooldown as jest.Mock).mockResolvedValue(true);

      const engine = new AlertEngine({ pool: mockPool });
      const count = await engine.processEvent(mockEvent);

      expect(count).toBe(0);
      expect(mockNotifier.send).not.toHaveBeenCalled();
      expect(db.createDelivery).not.toHaveBeenCalled();
    });

    it('should deduplicate and skip delivery when event was already delivered to that channel', async () => {
      (db.getActiveRules as jest.Mock).mockResolvedValue([mockRule]);
      (db.isWithinCooldown as jest.Mock).mockResolvedValue(false);
      (db.isAlreadyDelivered as jest.Mock).mockResolvedValue(true);

      const engine = new AlertEngine({ pool: mockPool });
      const count = await engine.processEvent(mockEvent);

      expect(count).toBe(0);
      expect(mockNotifier.send).not.toHaveBeenCalled();
      expect(db.createDelivery).not.toHaveBeenCalled();
    });
  });

  describe('Asteroid Processing', () => {
    it('should evaluate asteroid rules and deliver notification', async () => {
      const asteroidRule = {
        id: 'rule-ast-1',
        name: 'Dangerous Asteroids',
        type: 'asteroid',
        config: { hazardousOnly: true },
        channels: ['telegram'],
        cooldown_minutes: 0,
        active: true,
        telegram_chat_id: 'chat-200',
        user_email: 'astro@example.com',
      };

      const asteroid: any = {
        neo_id: 'AST-777',
        name: 'Asteroid 777',
        approach_date: '2026-10-25',
        miss_distance_km: 1500000,
        velocity_kps: 22,
        hazardous: true,
      };

      (db.getActiveRules as jest.Mock).mockResolvedValue([asteroidRule]);
      (db.isWithinCooldown as jest.Mock).mockResolvedValue(false);
      (db.isAlreadyDelivered as jest.Mock).mockResolvedValue(false);
      (db.createDelivery as jest.Mock).mockResolvedValue({ id: 'del-2' });

      const engine = new AlertEngine({ pool: mockPool, maxRetries: 1 });
      const count = await engine.processAsteroid(asteroid);

      expect(count).toBe(1);
      expect(mockNotifier.send).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: 'chat-200',
          body: expect.stringContaining('Approach Date: Oct 25, 2026'),
        })
      );
      expect(db.createDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          rule_id: 'rule-ast-1',
          event_ref: 'AST-777',
          status: 'sent',
        }),
        mockPool
      );
    });
  });
});
