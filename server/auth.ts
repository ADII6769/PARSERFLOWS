import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, User } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'parseflow-super-secret-key-production-grade';
const JWT_EXPIRES_IN = '7d';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'FAILED',
      error_code: 'UNAUTHORIZED',
      message: 'Authentication token is missing or malformed.',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    const user = db.getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: 'FAILED',
        error_code: 'USER_NOT_FOUND',
        message: 'The user belonging to this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (err: any) {
    return res.status(401).json({
      status: 'FAILED',
      error_code: 'INVALID_TOKEN',
      message: 'Session has expired or is invalid. Please sign in again.',
    });
  }
}

// Optional auth for public preview or demo
export function optionalAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      const user = db.getUserById(decoded.id);
      if (user) req.user = user;
    } catch (e) {}
  }
  next();
}
