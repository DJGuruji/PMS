import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
}

export const signAccessToken = (payload: JWTPayload) => {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
};

export const signRefreshToken = (userId: string) => {
  return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, ACCESS_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): { userId: string } | null => {
  try {
    return jwt.verify(token, REFRESH_SECRET) as { userId: string };
  } catch (error) {
    return null;
  }
};
