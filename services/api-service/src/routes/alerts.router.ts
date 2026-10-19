import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  getRulesByUserId,
  getRuleById,
  createRule,
  updateRule,
  deleteRule,
  getDeliveriesByUserId,
  getUserById,
  getPool,
} from '@mission-control/db';
import { getNotifier } from '@mission-control/alert-service';
import { authMiddleware } from '../middleware/auth.middleware';

export const alertsRouter = Router();

// Require auth for all alert routes
alertsRouter.use(authMiddleware);

export const SolarFlareConfigSchema = z.object({
  minClass: z
    .string()
    .regex(/^[XMCB][0-9]+(\.[0-9]+)?$/, 'Must be a valid solar flare class (e.g. M5, X1)'),
});

export const AsteroidConfigSchema = z.object({
  hazardousOnly: z.boolean().optional(),
  maxMissDistanceKm: z.number().positive('maxMissDistanceKm must be positive').optional(),
});

export const NaturalEventConfigSchema = z.object({
  categories: z.array(z.string()).optional(),
  center: z.tuple([z.number(), z.number()]).optional(), // [longitude, latitude]
  radiusKm: z.number().positive('radiusKm must be positive').optional(),
});

export const CreateRuleSchema = z.discriminatedUnion('type', [
  z.object({
    name: z.string().min(1, 'Rule name is required'),
    type: z.literal('solar_flare'),
    config: SolarFlareConfigSchema,
    channels: z
      .array(z.enum(['telegram', 'discord', 'email']))
      .min(1, 'At least one channel is required'),
    cooldown_minutes: z.number().int().min(0).default(60).optional(),
    active: z.boolean().default(true).optional(),
  }),
  z.object({
    name: z.string().min(1, 'Rule name is required'),
    type: z.literal('asteroid'),
    config: AsteroidConfigSchema,
    channels: z
      .array(z.enum(['telegram', 'discord', 'email']))
      .min(1, 'At least one channel is required'),
    cooldown_minutes: z.number().int().min(0).default(60).optional(),
    active: z.boolean().default(true).optional(),
  }),
  z.object({
    name: z.string().min(1, 'Rule name is required'),
    type: z.literal('natural_event'),
    config: NaturalEventConfigSchema,
    channels: z
      .array(z.enum(['telegram', 'discord', 'email']))
      .min(1, 'At least one channel is required'),
    cooldown_minutes: z.number().int().min(0).default(60).optional(),
    active: z.boolean().default(true).optional(),
  }),
]);

export const UpdateRuleSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['solar_flare', 'asteroid', 'natural_event']).optional(),
  config: z.record(z.any()).optional(),
  channels: z
    .array(z.enum(['telegram', 'discord', 'email']))
    .min(1)
    .optional(),
  cooldown_minutes: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export const TestAlertSchema = z.object({
  channel: z.enum(['telegram', 'discord', 'email']).optional(),
  message: z.string().optional(),
});

// GET /api/alerts/rules - list rules for authenticated user
alertsRouter.get('/rules', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const rules = await getRulesByUserId(req.user!.id, pool);
    res.json({
      success: true,
      data: rules,
      error: null,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      data: null,
      error: err.message,
    });
  }
});

// POST /api/alerts/rules - create alert rule
alertsRouter.post('/rules', async (req: Request, res: Response) => {
  try {
    const parseResult = CreateRuleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        data: null,
        error: parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      });
    }

    const { name, type, config, channels, cooldown_minutes, active } = parseResult.data;
    const pool = getPool();

    const created = await createRule(
      {
        user_id: req.user!.id,
        name,
        type,
        config,
        channels,
        cooldown_minutes: cooldown_minutes ?? 60,
        active: active ?? true,
      },
      pool
    );

    res.status(201).json({
      success: true,
      data: created,
      error: null,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      data: null,
      error: err.message,
    });
  }
});

// PUT /api/alerts/rules/:id - update alert rule
alertsRouter.put('/rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const existingRule = await getRuleById(id, pool);
    if (!existingRule || existingRule.user_id !== req.user!.id) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Alert rule not found',
      });
    }

    const parseResult = UpdateRuleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        data: null,
        error: parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      });
    }

    const updates = parseResult.data;

    // If config or type is updated, validate config
    if (updates.config) {
      const typeToCheck = updates.type || existingRule.type;
      try {
        if (typeToCheck === 'solar_flare') {
          SolarFlareConfigSchema.parse(updates.config);
        } else if (typeToCheck === 'asteroid') {
          AsteroidConfigSchema.parse(updates.config);
        } else if (typeToCheck === 'natural_event') {
          NaturalEventConfigSchema.parse(updates.config);
        }
      } catch (validationErr: any) {
        return res.status(400).json({
          success: false,
          data: null,
          error: `Invalid config for ${typeToCheck}: ${validationErr.message}`,
        });
      }
    }

    const updated = await updateRule(id, req.user!.id, updates, pool);

    res.json({
      success: true,
      data: updated,
      error: null,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      data: null,
      error: err.message,
    });
  }
});

// DELETE /api/alerts/rules/:id - delete alert rule
alertsRouter.delete('/rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const deleted = await deleteRule(id, req.user!.id, pool);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Alert rule not found',
      });
    }

    res.json({
      success: true,
      data: { deleted: true },
      error: null,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      data: null,
      error: err.message,
    });
  }
});

// GET /api/alerts/history - past notifications for user
alertsRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const pool = getPool();

    const deliveries = await getDeliveriesByUserId(req.user!.id, limit, offset, pool);

    res.json({
      success: true,
      data: deliveries,
      error: null,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      data: null,
      error: err.message,
    });
  }
});

// POST /api/alerts/test - send a test notification
alertsRouter.post('/test', async (req: Request, res: Response) => {
  try {
    const parseResult = TestAlertSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        data: null,
        error: parseResult.error.errors.map((e) => e.message).join(', '),
      });
    }

    const { channel, message } = parseResult.data;
    const pool = getPool();
    const user = await getUserById(req.user!.id, pool);

    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'User not found',
      });
    }

    const channelsToTest: ('telegram' | 'discord' | 'email')[] = channel
      ? [channel]
      : (['email', 'telegram', 'discord'] as const).filter((ch) => {
          if (ch === 'email') return !!user.email;
          if (ch === 'telegram') return !!user.telegram_chat_id;
          if (ch === 'discord') return !!user.discord_webhook;
          return false;
        });

    if (channelsToTest.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'No active notification destinations configured on your profile',
      });
    }

    const results = [];
    for (const ch of channelsToTest) {
      let recipient = '';
      if (ch === 'email') recipient = user.email;
      else if (ch === 'telegram') recipient = user.telegram_chat_id || '';
      else if (ch === 'discord') recipient = user.discord_webhook || '';

      if (!recipient) {
        results.push({
          channel: ch,
          success: false,
          error: `No destination configured for ${ch} on your profile`,
        });
        continue;
      }

      const notifier = getNotifier(ch);
      if (!notifier) {
        results.push({
          channel: ch,
          success: false,
          error: `Notifier for ${ch} is not available`,
        });
        continue;
      }

      const result = await notifier.send({
        recipient,
        title: 'Mission Control Alert Test',
        body: message || 'This is a test alert notification from Mission Control.',
        severity: 'TEST',
        timestamp: new Date().toISOString(),
      });
      results.push(result);
    }

    const allFailed = results.length > 0 && results.every((r) => !r.success);
    if (channel && results[0] && !results[0].success) {
      return res.status(400).json({
        success: false,
        data: {
          results,
        },
        error: results[0].error || `Failed to send test alert via ${channel}`,
      });
    }

    if (allFailed) {
      return res.status(400).json({
        success: false,
        data: {
          results,
        },
        error: results[0]?.error || 'Failed to dispatch test notifications to configured channels',
      });
    }

    res.json({
      success: true,
      data: {
        results,
      },
      error: null,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      data: null,
      error: err.message,
    });
  }
});
