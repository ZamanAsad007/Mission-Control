import MockAdapter from 'axios-mock-adapter';
import { NasaClient } from '../src/client';
import { NeoWsFeedSchema, NearEarthObjectSchema } from '../src/schemas/neows';
import neowsFixture from '../fixtures/neows.json';

describe('NeoWs Endpoint and Schema', () => {
  it('should validate full NeoWs feed fixture', () => {
    const result = NeoWsFeedSchema.safeParse(neowsFixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.element_count).toBe(2);
      expect(result.data.near_earth_objects['2024-05-01'].length).toBe(2);
    }
  });

  it('should validate single asteroid schema correctly', () => {
    const asteroid = neowsFixture.near_earth_objects['2024-05-01'][0];
    const result = NearEarthObjectSchema.safeParse(asteroid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('3542519');
      expect(result.data.is_potentially_hazardous_asteroid).toBe(true);
      expect(result.data.close_approach_data.length).toBe(1);
    }
  });

  it('should fetch feed and skip invalid asteroid records gracefully', async () => {
    const client = new NasaClient({ apiKey: 'TEST_KEY' });
    const mock = new MockAdapter((client as any).http);

    const payloadWithInvalidRecord = {
      element_count: 2,
      near_earth_objects: {
        '2024-05-01': [
          neowsFixture.near_earth_objects['2024-05-01'][0],
          { id: 12345, missing_fields: true }, // invalid record
        ],
      },
    };

    mock.onGet('https://api.nasa.gov/neo/rest/v1/feed').reply(200, payloadWithInvalidRecord);

    const result = await client.getNeoWsFeed('2024-05-01', '2024-05-02');
    expect(result.asteroids.length).toBe(1);
    expect(result.asteroids[0].id).toBe('3542519');
    mock.restore();
  });
});
