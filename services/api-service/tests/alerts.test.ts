import request from 'supertest';
import { createApp } from '../src/app';
import * as db from '@mission-control/db';
import * as alertService from '@mission-control/alert-service';
import { signToken } from '../src/auth/jwt';

jest.mock('@mission-control/db', () => ({
  ...jest.requireActual('@mission-control/db'),
  getRulesByUserId: jest.fn(),
  getRuleById: jest.fn(),
  createRule: jest.fn(),
  updateRule: jest.fn(),
  deleteRule: jest.fn(),
  getDeliveriesByUserId: jest.fn(),
  getUserById: jest.fn(),
  getPool: jest.fn().mockReturnValue({}),
}));

jest.mock('@mission-control/alert-service', () => ({
  ...jest.requireActual('@mission-control/alert-service'),
  getNotifier: jest.fn(),
}));

describe('Alert Rules & History Endpoints', () => {
  const app = createApp();
  const userId = 'usr-test-123';
  const token = signToken({ id: userId, email: 'commander@nasa.gov' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/alerts/rules', () => {
    it('returns 401 without Bearer token', async () => {
      const res = await request(app).get('/api/alerts/rules');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns list of alert rules for authenticated user', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          user_id: userId,
          name: 'Major Solar Flares',
          type: 'solar_flare',
          config: { minClass: 'M5' },
          channels: ['email', 'telegram'],
          cooldown_minutes: 60,
          active: true,
          created_at: new Date().toISOString(),
        },
      ];
      (db.getRulesByUserId as jest.Mock).mockResolvedValue(mockRules);

      const res = await request(app)
        .get('/api/alerts/rules')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe('rule-1');
      expect(db.getRulesByUserId).toHaveBeenCalledWith(userId, expect.anything());
    });
  });

  describe('POST /api/alerts/rules', () => {
    it('creates a solar flare alert rule with valid config', async () => {
      const createdRule = {
        id: 'rule-flr',
        user_id: userId,
        name: 'Major Flares',
        type: 'solar_flare',
        config: { minClass: 'M5' },
        channels: ['email'],
        cooldown_minutes: 60,
        active: true,
      };
      (db.createRule as jest.Mock).mockResolvedValue(createdRule);

      const res = await request(app)
        .post('/api/alerts/rules')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Major Flares',
          type: 'solar_flare',
          config: { minClass: 'M5' },
          channels: ['email'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('rule-flr');
      expect(db.createRule).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          name: 'Major Flares',
          type: 'solar_flare',
          config: { minClass: 'M5' },
          channels: ['email'],
        }),
        expect.anything()
      );
    });

    it('creates an asteroid alert rule with valid config', async () => {
      const createdRule = {
        id: 'rule-ast',
        user_id: userId,
        name: 'Close Approaches',
        type: 'asteroid',
        config: { hazardousOnly: true, maxMissDistanceKm: 5000000 },
        channels: ['discord'],
        cooldown_minutes: 120,
        active: true,
      };
      (db.createRule as jest.Mock).mockResolvedValue(createdRule);

      const res = await request(app)
        .post('/api/alerts/rules')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Close Approaches',
          type: 'asteroid',
          config: { hazardousOnly: true, maxMissDistanceKm: 5000000 },
          channels: ['discord'],
          cooldown_minutes: 120,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('rule-ast');
    });

    it('creates a natural event alert rule with valid config', async () => {
      const createdRule = {
        id: 'rule-nat',
        user_id: userId,
        name: 'Nearby Wildfires',
        type: 'natural_event',
        config: { categories: ['wildfires'], center: [90.4, 23.8], radiusKm: 500 },
        channels: ['email'],
        cooldown_minutes: 60,
        active: true,
      };
      (db.createRule as jest.Mock).mockResolvedValue(createdRule);

      const res = await request(app)
        .post('/api/alerts/rules')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Nearby Wildfires',
          type: 'natural_event',
          config: { categories: ['wildfires'], center: [90.4, 23.8], radiusKm: 500 },
          channels: ['email'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('rule-nat');
    });

    it('rejects invalid solar flare class in config with 400', async () => {
      const res = await request(app)
        .post('/api/alerts/rules')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Bad Flare Rule',
          type: 'solar_flare',
          config: { minClass: 'INVALID_CLASS' },
          channels: ['email'],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(db.createRule).not.toHaveBeenCalled();
    });

    it('rejects missing channels with 400', async () => {
      const res = await request(app)
        .post('/api/alerts/rules')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'No Channels Rule',
          type: 'solar_flare',
          config: { minClass: 'M1' },
          channels: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(db.createRule).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/alerts/rules/:id', () => {
    it('updates an existing rule', async () => {
      (db.getRuleById as jest.Mock).mockResolvedValue({
        id: 'rule-1',
        user_id: userId,
        name: 'Old Name',
        type: 'solar_flare',
        config: { minClass: 'M1' },
      });
      (db.updateRule as jest.Mock).mockResolvedValue({
        id: 'rule-1',
        user_id: userId,
        name: 'Updated Name',
        type: 'solar_flare',
        config: { minClass: 'M5' },
      });

      const res = await request(app)
        .put('/api/alerts/rules/rule-1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Name',
          config: { minClass: 'M5' },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Name');
    });

    it('returns 404 if rule does not exist or belongs to another user', async () => {
      (db.getRuleById as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .put('/api/alerts/rules/non-existent')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Alert rule not found');
    });

    it('returns 400 if updated config is invalid', async () => {
      (db.getRuleById as jest.Mock).mockResolvedValue({
        id: 'rule-1',
        user_id: userId,
        name: 'Flare Rule',
        type: 'solar_flare',
        config: { minClass: 'M1' },
      });

      const res = await request(app)
        .put('/api/alerts/rules/rule-1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          config: { minClass: 'NOT_A_CLASS' },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(db.updateRule).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/alerts/rules/:id', () => {
    it('deletes an existing rule', async () => {
      (db.deleteRule as jest.Mock).mockResolvedValue(true);

      const res = await request(app)
        .delete('/api/alerts/rules/rule-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deleted).toBe(true);
      expect(db.deleteRule).toHaveBeenCalledWith('rule-1', userId, expect.anything());
    });

    it('returns 404 if rule does not exist or user cannot delete it', async () => {
      (db.deleteRule as jest.Mock).mockResolvedValue(false);

      const res = await request(app)
        .delete('/api/alerts/rules/non-existent')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Alert rule not found');
    });
  });

  describe('GET /api/alerts/history', () => {
    it('returns delivery history for authenticated user', async () => {
      const mockHistory = [
        {
          id: 'del-1',
          rule_id: 'rule-1',
          event_ref: 'FLR-100',
          channel: 'email',
          status: 'sent',
          sent_at: new Date().toISOString(),
          rule_name: 'Major Solar Flares',
          rule_type: 'solar_flare',
        },
      ];
      (db.getDeliveriesByUserId as jest.Mock).mockResolvedValue(mockHistory);

      const res = await request(app)
        .get('/api/alerts/history?limit=10&offset=0')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe('del-1');
      expect(db.getDeliveriesByUserId).toHaveBeenCalledWith(userId, 10, 0, expect.anything());
    });
  });

  describe('POST /api/alerts/test', () => {
    it('sends test notification to user channels', async () => {
      (db.getUserById as jest.Mock).mockResolvedValue({
        id: userId,
        email: 'commander@nasa.gov',
        telegram_chat_id: '99887766',
        discord_webhook: 'https://discord.com/api/webhooks/test',
      });

      const mockNotifier = {
        send: jest.fn().mockResolvedValue({ success: true, channel: 'email' }),
      };
      (alertService.getNotifier as jest.Mock).mockReturnValue(mockNotifier);

      const res = await request(app)
        .post('/api/alerts/test')
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: 'email' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results).toHaveLength(1);
      expect(res.body.data.results[0].success).toBe(true);
      expect(alertService.getNotifier).toHaveBeenCalledWith('email');
      expect(mockNotifier.send).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: 'commander@nasa.gov',
          title: 'Mission Control Alert Test',
        })
      );
    });

    it('returns 400 if user has no destinations configured', async () => {
      (db.getUserById as jest.Mock).mockResolvedValue({
        id: userId,
        email: '',
        telegram_chat_id: null,
        discord_webhook: null,
      });

      const res = await request(app)
        .post('/api/alerts/test')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('No active notification destinations configured');
    });
  });
});
