import MockAdapter from 'axios-mock-adapter';
import { NasaClient } from '../src/client';
import { EonetResponseSchema, EonetEventSchema } from '../src/schemas/eonet';
import eonetFixture from '../fixtures/eonet.json';

describe('EONET Endpoint and Schema', () => {
  it('should validate full EONET fixture', () => {
    const result = EonetResponseSchema.safeParse(eonetFixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.events.length).toBe(2);
      expect(result.data.events[0].id).toBe('EONET_25094');
    }
  });

  it('should validate single EONET event with geometry coordinates', () => {
    const event = eonetFixture.events[0];
    const result = EonetEventSchema.safeParse(event);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Hurricane Simon');
      expect(result.data.categories[0].id).toBe('severeStorms');
      expect(result.data.geometry[0].coordinates).toEqual([-104.3, 15.7]);
    }
  });

  it('should fetch EONET events and filter invalid items', async () => {
    const client = new NasaClient({ apiKey: 'TEST_KEY' });
    const mock = new MockAdapter((client as any).http);

    mock.onGet('https://eonet.gsfc.nasa.gov/api/v3/events').reply(200, {
      title: 'EONET Events',
      events: [eonetFixture.events[0], { id: 'INVALID', broken_event: true }],
    });

    const events = await client.getEonetEvents();
    expect(events.length).toBe(1);
    expect(events[0].id).toBe('EONET_25094');
    mock.restore();
  });
});
