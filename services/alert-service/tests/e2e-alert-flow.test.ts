import { AlertEngine } from '../src/engine';
import * as db from '@mission-control/db';
import * as notifiersModule from '../src/notifiers';

jest.mock('@mission-control/db');
jest.mock('../src/notifiers');

describe('End-to-End Alert Pipeline Integration Test', () => {
  let mockPool: any;
  let sentTelegramMessages: any[] = [];
  let sentEmailMessages: any[] = [];
  let inMemoryDeliveries: any[] = [];
  let inMemoryRules: any[] = [];
  let currentTimeMs: number;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = {};
    sentTelegramMessages = [];
    sentEmailMessages = [];
    inMemoryDeliveries = [];
    currentTimeMs = Date.now();

    // Configure mock notifiers
    const mockTelegramNotifier = {
      channel: 'telegram',
      send: jest.fn().mockImplementation(async (payload) => {
        sentTelegramMessages.push(payload);
        return { success: true };
      }),
    };

    const mockEmailNotifier = {
      channel: 'email',
      send: jest.fn().mockImplementation(async (payload) => {
        sentEmailMessages.push(payload);
        return { success: true };
      }),
    };

    (notifiersModule.getNotifier as jest.Mock).mockImplementation((channel: string) => {
      if (channel === 'telegram') return mockTelegramNotifier;
      if (channel === 'email') return mockEmailNotifier;
      return null;
    });

    // Stateful DB Mock
    (db.getActiveRules as jest.Mock).mockImplementation(async (type: string) => {
      return inMemoryRules.filter((r) => r.type === type && r.active);
    });

    (db.isWithinCooldown as jest.Mock).mockImplementation(
      async (ruleId: string, cooldownMinutes: number) => {
        if (!cooldownMinutes || cooldownMinutes <= 0) return false;
        const cooldownMs = cooldownMinutes * 60 * 1000;
        const recentDelivery = inMemoryDeliveries.find(
          (d) => d.rule_id === ruleId && currentTimeMs - d.created_at.getTime() < cooldownMs
        );
        return !!recentDelivery;
      }
    );

    (db.isAlreadyDelivered as jest.Mock).mockImplementation(
      async (ruleId: string, eventRef: string, channel: string) => {
        return inMemoryDeliveries.some(
          (d) => d.rule_id === ruleId && d.event_ref === eventRef && d.channel === channel
        );
      }
    );

    (db.createDelivery as jest.Mock).mockImplementation(async (delivery: any) => {
      const record = {
        id: `del-${inMemoryDeliveries.length + 1}`,
        ...delivery,
        created_at: new Date(currentTimeMs),
      };
      inMemoryDeliveries.push(record);
      return record;
    });
  });

  it('runs complete lifecycle: match -> dispatch -> record -> deduplicate -> cooldown -> filter', async () => {
    // 1. Setup Active Alert Rule: Solar flare X1.0 threshold across Telegram and Email
    const alertRule = {
      id: 'rule-flare-major',
      user_id: 'user-commander-1',
      name: 'Severe Solar Flare Alert (X-Class)',
      type: 'solar_flare',
      config: { minClass: 'X1.0' },
      channels: ['telegram', 'email'],
      cooldown_minutes: 30,
      active: true,
      telegram_chat_id: 'chat-nasa-ops',
      user_email: 'flight-director@mission-control.nasa.gov',
    };
    inMemoryRules.push(alertRule);

    const engine = new AlertEngine({ pool: mockPool });

    // Step 1: Ingest mock DONKI event (X2.5 class flare)
    const flareX25: any = {
      id: 'evt-donki-x25-20261020',
      source: 'DONKI_FLR',
      source_id: '2026-10-20T00:15:00-FLR-001',
      category: 'solar_flare',
      title: 'Solar Flare X2.5',
      description: 'Major coronal eruption detected by SDO',
      severity: 'X2.5',
      started_at: '2026-10-20T00:15:00Z',
      location: 'N18W45',
      metadata: { classType: 'X2.5', flrID: '2026-10-20T00:15:00-FLR-001' },
    };

    const initialDispatchCount = await engine.processEvent(flareX25);

    // Verify AlertEngine matches rule and dispatches to both configured channels
    expect(initialDispatchCount).toBe(2);
    expect(sentTelegramMessages).toHaveLength(1);
    expect(sentTelegramMessages[0].recipient).toBe('chat-nasa-ops');
    expect(sentTelegramMessages[0].title).toContain('Solar Flare X2.5');

    expect(sentEmailMessages).toHaveLength(1);
    expect(sentEmailMessages[0].recipient).toBe('flight-director@mission-control.nasa.gov');
    expect(sentEmailMessages[0].title).toContain('X2.5');
    expect(sentEmailMessages[0].severity).toBe('X2.5');

    // Verify alert delivery recorded in database
    expect(inMemoryDeliveries).toHaveLength(2);
    expect(inMemoryDeliveries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rule_id: 'rule-flare-major',
          event_ref: 'evt-donki-x25-20261020',
          channel: 'telegram',
          status: 'sent',
        }),
        expect.objectContaining({
          rule_id: 'rule-flare-major',
          event_ref: 'evt-donki-x25-20261020',
          channel: 'email',
          status: 'sent',
        }),
      ])
    );

    // Step 2: Trigger same event again -> verify deduplication (no second alert)
    const duplicateDispatchCount = await engine.processEvent(flareX25);
    expect(duplicateDispatchCount).toBe(0);
    // Counts should remain at 1 each
    expect(sentTelegramMessages).toHaveLength(1);
    expect(sentEmailMessages).toHaveLength(1);
    expect(inMemoryDeliveries).toHaveLength(2);

    // Step 3: Trigger another high-severity event within the 30-minute cooldown window
    currentTimeMs += 10 * 60 * 1000; // +10 minutes later (still within 30m cooldown)
    const flareX41: any = {
      id: 'evt-donki-x41-20261020',
      source: 'DONKI_FLR',
      source_id: '2026-10-20T00:25:00-FLR-002',
      category: 'solar_flare',
      title: 'Solar Flare X4.1',
      description: 'Second massive coronal eruption',
      severity: 'X4.1',
      started_at: '2026-10-20T00:25:00Z',
      metadata: { classType: 'X4.1' },
    };

    const cooldownDispatchCount = await engine.processEvent(flareX41);
    // Cooldown suppression should prevent delivery
    expect(cooldownDispatchCount).toBe(0);
    expect(sentTelegramMessages).toHaveLength(1);
    expect(sentEmailMessages).toHaveLength(1);
    expect(inMemoryDeliveries).toHaveLength(2);

    // Step 4: Advance clock past cooldown window (+35 minutes after initial event)
    currentTimeMs += 25 * 60 * 1000; // total 35 minutes since first delivery
    const flareX50: any = {
      id: 'evt-donki-x50-20261020',
      source: 'DONKI_FLR',
      source_id: '2026-10-20T00:50:00-FLR-003',
      category: 'solar_flare',
      title: 'Solar Flare X5.0',
      description: 'Extreme coronal eruption',
      severity: 'X5.0',
      started_at: '2026-10-20T00:50:00Z',
      metadata: { classType: 'X5.0' },
    };

    const postCooldownDispatchCount = await engine.processEvent(flareX50);
    expect(postCooldownDispatchCount).toBe(2);
    expect(sentTelegramMessages).toHaveLength(2);
    expect(sentEmailMessages).toHaveLength(2);
    expect(inMemoryDeliveries).toHaveLength(4);

    // Step 5: Sub-threshold event (M3.2 flare) -> verify rule matcher filters it out
    const flareM32: any = {
      id: 'evt-donki-m32-20261020',
      source: 'DONKI_FLR',
      source_id: '2026-10-20T01:10:00-FLR-004',
      category: 'solar_flare',
      title: 'Solar Flare M3.2',
      severity: 'M3.2',
      started_at: '2026-10-20T01:10:00Z',
      metadata: { classType: 'M3.2' },
    };

    const filteredDispatchCount = await engine.processEvent(flareM32);
    expect(filteredDispatchCount).toBe(0);
    expect(sentTelegramMessages).toHaveLength(2);
    expect(sentEmailMessages).toHaveLength(2);
    expect(inMemoryDeliveries).toHaveLength(4);
  });
});
