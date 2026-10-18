import MockAdapter from 'axios-mock-adapter';
import { NasaClient } from '../src/client';
import { ApodItemSchema } from '../src/schemas/apod';
import apodFixture from '../fixtures/apod.json';

describe('APOD Endpoint and Schema', () => {
  it('should validate valid APOD fixture against schema', () => {
    const result = ApodItemSchema.safeParse(apodFixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Sonified: The Eagle Nebula');
      expect(result.data.media_type).toBe('image');
    }
  });

  it('should fetch APOD for a specific date using NasaClient', async () => {
    const client = new NasaClient({ apiKey: 'TEST_KEY' });
    const mock = new MockAdapter((client as any).http);

    mock.onGet('https://api.nasa.gov/planetary/apod').reply(200, apodFixture);

    const apod = await client.getApod({ date: '2026-10-18' });
    expect(apod.date).toBe('2026-10-18');
    expect(apod.url).toContain('EagleSonification');
    mock.restore();
  });
});
