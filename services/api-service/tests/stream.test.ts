import request from 'supertest';
import { createApp } from '../src/app';
import {
  broadcastEvent,
  getConnectedClientCount,
  ensureSubscribed,
  resetSubscription,
} from '../src/routes/stream.router';
import * as redisModule from '../src/redis';

jest.mock('../src/redis');

describe('SSE Stream Endpoint (/api/stream)', () => {
  let mockSubscriber: any;

  beforeEach(() => {
    resetSubscription();
    mockSubscriber = {
      subscribe: jest.fn((_ch1, _ch2, cb) => cb && cb(null)),
      on: jest.fn(),
      quit: jest.fn().mockResolvedValue('OK'),
    };
    (redisModule.getRedisSubscriber as jest.Mock).mockReturnValue(mockSubscriber);
  });

  it('should establish SSE connection and send handshake', (done) => {
    const app = createApp();
    const server = app.listen(0, () => {
      const port = (server.address() as any).port;
      const req = request(`http://localhost:${port}`)
        .get('/api/stream')
        .expect('Content-Type', /text\/event-stream/)
        .expect('Cache-Control', /no-cache/)
        .expect(200);

      req.buffer(false).parse((res, callback) => {
        let buffer = '';
        res.on('data', (chunk) => {
          buffer += chunk.toString();
          if (buffer.includes('event: connected')) {
            expect(buffer).toContain('"status":"connected"');
            expect(getConnectedClientCount()).toBeGreaterThan(0);
            server.close();
            callback(null, buffer);
            done();
          }
        });
      });

      req.end(() => {});
    });
  });

  it('should forward broadcasted events to connected clients', (done) => {
    const app = createApp();
    const server = app.listen(0, () => {
      const port = (server.address() as any).port;
      const req = request(`http://localhost:${port}`).get('/api/stream').expect(200);

      req.buffer(false).parse((res, callback) => {
        let buffer = '';
        let connected = false;

        res.on('data', (chunk) => {
          buffer += chunk.toString();

          if (!connected && buffer.includes('event: connected')) {
            connected = true;
            // Send broadcast event
            broadcastEvent('event.created', { id: 'evt-sse-1', title: 'Live Flare' });
          }

          if (buffer.includes('Live Flare')) {
            expect(buffer).toContain('event: event.created');
            expect(buffer).toContain('Live Flare');
            server.close();
            callback(null, buffer);
            done();
          }
        });
      });

      req.end(() => {});
    });
  });

  it('ensureSubscribed should attach Redis subscriber listener', () => {
    ensureSubscribed();
    expect(mockSubscriber.subscribe).toHaveBeenCalledWith(
      'event.created',
      'asteroid.created',
      expect.any(Function)
    );
  });
});
