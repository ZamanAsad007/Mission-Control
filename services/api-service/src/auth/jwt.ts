import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';

export interface UserJwtPayload {
  id: string;
  email: string;
}

export function signToken(payload: UserJwtPayload, expiresIn: SignOptions['expiresIn'] = '7d'): string {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, config.jwtSecret, options);
}

export function verifyToken(token: string): UserJwtPayload {
  return jwt.verify(token, config.jwtSecret) as UserJwtPayload;
}
