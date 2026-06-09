import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../config/database';

const router = Router();

/**
 * GET /api/users/me/markers
 * Get current user's markers
 */
router.get('/me/markers', authMiddleware, async (_req, res, next) => {
  try {
    // For now, return empty array since we don't have user tracking in markers yet
    // TODO: Add submittedBy field to Marker model
    const markers: any[] = [];

    return res.json({ data: markers });
  } catch (error) {
    console.error('Error fetching user markers:', error);
    return next(error);
  }
});

/**
 * GET /api/users/me/feedback
 * Get current user's feedback
 */
router.get('/me/feedback', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;

    const feedback = await prisma.feedback.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        marker: {
          select: {
            id: true,
            title: true,
            address: true,
          },
        },
      },
    });

    return res.json({ data: feedback });
  } catch (error) {
    return next(error);
  }
});

export default router;

