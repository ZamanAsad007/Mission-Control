import { Request, Response, NextFunction } from 'express';
import { verifyToken, UserJwtPayload } from '../auth/jwt';

// Extend Express Request type with user
declare global {
  namespace Express {
    interface Request {
      user?: UserJwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      data: null,
      error: 'Authentication required. Missing Bearer token.',
    });
  }

  const token = authHeader.slice(7).trim();

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      data: null,
      error: `Invalid or expired token: ${err.message}`,
    });
  }
}
