import { Request, Response, NextFunction } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { env } from '../config/env';
import { type AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const RegisterSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email().optional(),
  password: z.string().min(6).max(100),
});

const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const signToken = (payload: { userId: number; username: string; role: string }) => {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_SECRET, options);
};

export class AuthController {
  /**
   * POST /api/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = RegisterSchema.parse(req.body);

      // Check if username exists
      const existingUser = await prisma.user.findUnique({
        where: { username: data.username },
      });

      if (existingUser) {
        throw new AppError(400, 'Username already exists', 'USERNAME_EXISTS');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          username: data.username,
          email: data.email,
          passwordHash: hashedPassword,
          role: 'user',
          reputationScore: 0,
        },
      });

      // Generate JWT
      const token = signToken({ userId: user.id, username: user.username, role: user.role });

      res.status(201).json({
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            reputationScore: user.reputationScore,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = LoginSchema.parse(req.body);

      // Find user
      const user = await prisma.user.findUnique({
        where: { username: data.username },
      });

      if (!user || !user.passwordHash) {
        throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

      if (!isValidPassword) {
        throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
      }

      // Generate JWT
      const token = signToken({ userId: user.id, username: user.username, role: user.role });

      res.json({
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            reputationScore: user.reputationScore,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   */
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthRequest).user?.userId;

      if (!userId) {
        throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          reputationScore: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
      }

      res.json({ data: user });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
