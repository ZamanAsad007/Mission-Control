import MockAdapter from 'axios-mock-adapter';
import { NasaClient } from '../src/client';
import apodFixture from '../fixtures/apod.json';

describe('NasaClient', () => {
  let mock: MockAdapter;
  let client: NasaClient;

  beforeEach(() => {
    client = new NasaClient({
      apiKey: 'TEST_KEY',
      timeoutMs: 5000,
      maxRetries: 2,
      initialRetryDelayMs: 10,
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    });
    mock = new MockAdapter((client as any).http);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should fetch APOD successfully on 200 response', async () => {
    mock.onGet('https://api.nasa.gov/planetary/apod').reply(200, apodFixture);

    const apod = await client.getApod();
    expect(apod.title).toBe(apodFixture.title);
    expect(apod.date).toBe(apodFixture.date);
    expect(apod.media_type).toBe('image');
  });

  it('should retry on 500 error and succeed if subsequent request passes', async () => {
    mock
      .onGet('https://api.nasa.gov/planetary/apod')
      .replyOnce(500, { error: 'Internal server error' })
      .onGet('https://api.nasa.gov/planetary/apod')
      .reply(200, apodFixture);

    const apod = await client.getApod();
    expect(apod.title).toBe(apodFixture.title);
  });

  it('should retry on 429 rate limit with Retry-After header', async () => {
    mock
      .onGet('https://api.nasa.gov/planetary/apod')
      .replyOnce(429, { error: 'Rate limit exceeded' }, { 'retry-after': '1' })
      .onGet('https://api.nasa.gov/planetary/apod')
      .reply(200, apodFixture);

    const apod = await client.getApod();
    expect(apod.title).toBe(apodFixture.title);
  });

  it('should throw an error if max retries are exceeded', async () => {
    mock
      .onGet('https://api.nasa.gov/planetary/apod')
      .reply(500, { error: 'Persistent server error' });

    await expect(client.getApod()).rejects.toThrow();
  });
});
