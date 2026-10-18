import { Router, Request, Response } from 'express';
import { getRedisSubscriber } from '../redis';

export const streamRouter = Router();

// Track active SSE client connections
const clients = new Set<Response>();
let isSubscribed = false;

export function getConnectedClientCount(): number {
  return clients.size;
}

export function resetSubscription(): void {
  isSubscribed = false;
}

export function broadcastEvent(event: string, data: any): void {
  const payload = `event: ${event}\ndata: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

export function ensureSubscribed(): void {
  if (isSubscribed) return;

  try {
    const subscriber = getRedisSubscriber();
    subscriber.subscribe('event.created', 'asteroid.created', (err) => {
      if (err) {
        console.error('[SSE Stream] Failed to subscribe to Redis channels:', err.message);
      } else {
        console.log('[SSE Stream] Subscribed to Redis channels for real-time streaming');
        isSubscribed = true;
      }
    });

    subscriber.on('message', (channel, message) => {
      broadcastEvent(channel, message);
    });
  } catch (err: any) {
    console.error('[SSE Stream Redis Error]', err.message);
  }
}

// GET /api/stream
streamRouter.get('/', (req: Request, res: Response) => {
  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx proxy buffering

  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  // Initial connection handshake message
  res.write(
    `event: connected\ndata: ${JSON.stringify({ status: 'connected', time: new Date().toISOString() })}\n\n`
  );

  clients.add(res);
  ensureSubscribed();

  // Heartbeat comment every 20 seconds to keep connection alive through proxies
  const heartbeatInterval = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 20000);

  // Unref interval so it doesn't block process exit or Jest tests
  if (typeof heartbeatInterval.unref === 'function') {
    heartbeatInterval.unref();
  }

  // Handle client disconnection
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    clients.delete(res);
  });
});
