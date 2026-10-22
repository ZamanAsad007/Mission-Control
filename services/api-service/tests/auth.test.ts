import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app';
import * as db from '@mission-control/db';
import { signToken } from '../src/auth/jwt';

jest.mock('@mission-control/db', () => ({
  ...jest.requireActual('@mission-control/db'),
  createUser: jest.fn(),
  getUserByEmail: jest.fn(),
  getUserById: jest.fn(),
  updateUserIntegrations: jest.fn(),
  getPool: jest.fn().mockReturnValue({}),
}));

describe('Auth Endpoints', () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('registers a new user successfully and returns token', async () => {
      (db.getUserByEmail as jest.Mock).mockResolvedValue(null);
      (db.createUser as jest.Mock).mockResolvedValue({
        id: 'usr-123',
        email: 'astronaut@nasa.gov',
        password_hash: 'hashed_pw',
        telegram_chat_id: '12345678',
        discord_webhook: 'https://discord.com/api/webhooks/test',
        created_at: new Date('2026-10-18T10:00:00Z'),
      });

      const res = await request(app).post('/api/auth/register').send({
        email: 'astronaut@nasa.gov',
        password: 'supersecretpassword',
        telegram_chat_id: '12345678',
        discord_webhook: 'https://discord.com/api/webhooks/test',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe('usr-123');
      expect(res.body.data.user.email).toBe('astronaut@nasa.gov');
      expect(res.body.data.user.password_hash).toBeUndefined();
      expect(typeof res.body.data.token).toBe('string');
      expect(db.createUser).toHaveBeenCalled();
    });

    it('returns 409 conflict if email already exists', async () => {
      (db.getUserByEmail as jest.Mock).mockResolvedValue({
        id: 'usr-existing',
        email: 'astronaut@nasa.gov',
        password_hash: 'existing_hash',
      });

      const res = await request(app).post('/api/auth/register').send({
        email: 'astronaut@nasa.gov',
        password: 'supersecretpassword',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('already exists');
      expect(db.createUser).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid email or short password', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'not-an-email',
        password: '123',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(db.createUser).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in successfully with correct credentials', async () => {
      const hashedPassword = await bcrypt.hash('correct_password', 10);
      (db.getUserByEmail as jest.Mock).mockResolvedValue({
        id: 'usr-123',
        email: 'astronaut@nasa.gov',
        password_hash: hashedPassword,
        telegram_chat_id: null,
        discord_webhook: null,
        created_at: new Date('2026-10-18T10:00:00Z'),
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'astronaut@nasa.gov',
        password: 'correct_password',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe('usr-123');
      expect(typeof res.body.data.token).toBe('string');
    });

    it('returns 401 if user does not exist', async () => {
      (db.getUserByEmail as jest.Mock).mockResolvedValue(null);

      const res = await request(app).post('/api/auth/login').send({
        email: 'unknown@nasa.gov',
        password: 'somepassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('returns 401 if password does not match', async () => {
      const hashedPassword = await bcrypt.hash('correct_password', 10);
      (db.getUserByEmail as jest.Mock).mockResolvedValue({
        id: 'usr-123',
        email: 'astronaut@nasa.gov',
        password_hash: hashedPassword,
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'astronaut@nasa.gov',
        password: 'wrong_password',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid email or password');
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns user profile when authenticated with valid Bearer token', async () => {
      const token = signToken({ id: 'usr-123', email: 'astronaut@nasa.gov' });
      (db.getUserById as jest.Mock).mockResolvedValue({
        id: 'usr-123',
        email: 'astronaut@nasa.gov',
        telegram_chat_id: 'chat-999',
        discord_webhook: null,
        created_at: new Date('2026-10-18T10:00:00Z'),
      });

      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('usr-123');
      expect(res.body.data.email).toBe('astronaut@nasa.gov');
    });

    it('returns 401 if Authorization header is missing', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Missing Bearer token');
    });

    it('returns 401 if token is invalid', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid or expired token');
    });

    it('returns 404 if user is not found in database', async () => {
      const token = signToken({ id: 'usr-deleted', email: 'ghost@nasa.gov' });
      (db.getUserById as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('User not found');
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('updates user notification integrations successfully', async () => {
      const token = signToken({ id: 'usr-123', email: 'astronaut@nasa.gov' });
      (db.updateUserIntegrations as jest.Mock).mockResolvedValue({
        id: 'usr-123',
        email: 'astronaut@nasa.gov',
        telegram_chat_id: 'chat-888',
        discord_webhook: 'https://discord.com/api/webhooks/updated',
        created_at: new Date('2026-10-18T10:00:00Z'),
      });

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          telegram_chat_id: 'chat-888',
          discord_webhook: 'https://discord.com/api/webhooks/updated',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.telegram_chat_id).toBe('chat-888');
      expect(res.body.data.discord_webhook).toBe('https://discord.com/api/webhooks/updated');
      expect(db.updateUserIntegrations).toHaveBeenCalledWith(
        'usr-123',
        {
          telegram_chat_id: 'chat-888',
          discord_webhook: 'https://discord.com/api/webhooks/updated',
        },
        expect.anything()
      );
    });

    it('returns 400 when changing password with incorrect current password', async () => {
      const token = signToken({ id: 'usr-123', email: 'astronaut@nasa.gov' });
      const hashedOld = await bcrypt.hash('correctPassword123', 10);
      (db.getUserById as jest.Mock).mockResolvedValue({
        id: 'usr-123',
        email: 'astronaut@nasa.gov',
        password_hash: hashedOld,
      });

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          current_password: 'wrongPassword',
          new_password: 'brandNewPassword123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Current password is incorrect');
    });

    it('successfully updates password when current password is valid', async () => {
      const token = signToken({ id: 'usr-123', email: 'astronaut@nasa.gov' });
      const hashedOld = await bcrypt.hash('correctPassword123', 10);
      (db.getUserById as jest.Mock).mockResolvedValue({
        id: 'usr-123',
        email: 'astronaut@nasa.gov',
        password_hash: hashedOld,
      });
      (db.updateUserIntegrations as jest.Mock).mockResolvedValue({
        id: 'usr-123',
        email: 'astronaut@nasa.gov',
        telegram_chat_id: null,
        discord_webhook: null,
        created_at: new Date('2026-10-18T10:00:00Z'),
      });

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          current_password: 'correctPassword123',
          new_password: 'brandNewPassword123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(db.updateUserIntegrations).toHaveBeenCalledWith(
        'usr-123',
        expect.objectContaining({
          password_hash: expect.any(String),
        }),
        expect.anything()
      );
    });

    it('returns 400 when discord_webhook is an invalid URL format', async () => {
      const token = signToken({ id: 'usr-123', email: 'astronaut@nasa.gov' });

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          discord_webhook: 'not-a-valid-url',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid Discord webhook URL');
    });

    it('returns 401 if unauthenticated', async () => {
      const res = await request(app).put('/api/auth/profile').send({
        telegram_chat_id: '12345',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
