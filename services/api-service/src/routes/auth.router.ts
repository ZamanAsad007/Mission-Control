import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createUser, getUserByEmail, getUserById, getPool } from '@mission-control/db';
import { signToken } from '../auth/jwt';
import { authMiddleware } from '../middleware/auth.middleware';

export const authRouter = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  telegram_chat_id: z.string().optional().nullable(),
  discord_webhook: z.string().url('Invalid Discord webhook URL').optional().nullable(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const parseResult = RegisterSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        data: null,
        error: parseResult.error.errors.map((e) => e.message).join(', '),
      });
    }

    const { email, password, telegram_chat_id, discord_webhook } = parseResult.data;
    const pool = getPool();

    const existingUser = await getUserByEmail(email, pool);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        data: null,
        error: 'A user with this email already exists',
      });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await createUser(
      {
        email,
        password_hash,
        telegram_chat_id: telegram_chat_id || null,
        discord_webhook: discord_webhook || null,
      },
      pool
    );

    const token = signToken({ id: user.id!, email: user.email });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          telegram_chat_id: user.telegram_chat_id,
          discord_webhook: user.discord_webhook,
          created_at: user.created_at,
        },
        token,
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

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const parseResult = LoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        data: null,
        error: parseResult.error.errors.map((e) => e.message).join(', '),
      });
    }

    const { email, password } = parseResult.data;
    const pool = getPool();

    const user = await getUserByEmail(email, pool);
    if (!user) {
      return res.status(401).json({
        success: false,
        data: null,
        error: 'Invalid email or password',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        data: null,
        error: 'Invalid email or password',
      });
    }

    const token = signToken({ id: user.id!, email: user.email });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          telegram_chat_id: user.telegram_chat_id,
          discord_webhook: user.discord_webhook,
          created_at: user.created_at,
        },
        token,
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

// GET /api/auth/me
authRouter.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const user = await getUserById(req.user!.id, pool);

    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        telegram_chat_id: user.telegram_chat_id,
        discord_webhook: user.discord_webhook,
        created_at: user.created_at,
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
