import MockAdapter from 'axios-mock-adapter';
import { NasaClient } from '../src/client';
import { SolarFlareSchema, CoronalMassEjectionSchema } from '../src/schemas/donki';
import donkiFlrFixture from '../fixtures/donki-flr.json';
import donkiCmeFixture from '../fixtures/donki-cme.json';

describe('DONKI Endpoints and Schemas', () => {
  it('should validate solar flare fixture', () => {
    const flare = donkiFlrFixture[0];
    const result = SolarFlareSchema.safeParse(flare);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.flrID).toBe('2024-05-05T06:01:00-FLR-001');
      expect(result.data.classType).toBe('X1.3');
    }
  });

  it('should validate coronal mass ejection fixture', () => {
    const cme = donkiCmeFixture[0];
    const result = CoronalMassEjectionSchema.safeParse(cme);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.activityID).toBe('2024-05-05T09:24:00-CME-001');
      expect(result.data.cmeAnalyses?.[0].speed).toBe(820);
    }
  });

  it('should fetch flares and filter invalid items', async () => {
    const client = new NasaClient({ apiKey: 'TEST_KEY' });
    const mock = new MockAdapter((client as any).http);

    mock.onGet('https://api.nasa.gov/DONKI/FLR').reply(200, [
      donkiFlrFixture[0],
      { invalid: 'flare' },
    ]);

    const flares = await client.getDonkiSolarFlares('2024-05-01', '2024-05-05');
    expect(flares.length).toBe(1);
    expect(flares[0].classType).toBe('X1.3');
    mock.restore();
  });

  it('should fetch CMEs and filter invalid items', async () => {
    const client = new NasaClient({ apiKey: 'TEST_KEY' });
    const mock = new MockAdapter((client as any).http);

    mock.onGet('https://api.nasa.gov/DONKI/CME').reply(200, donkiCmeFixture);

    const cmes = await client.getDonkiCmes('2024-05-01', '2024-05-05');
    expect(cmes.length).toBe(1);
    expect(cmes[0].activityID).toBe('2024-05-05T09:24:00-CME-001');
    mock.restore();
  });
});
