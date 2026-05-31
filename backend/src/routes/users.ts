import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../config/database';

const router = Router();

/**
 * GET /api/users/me/markers
 * Get current user's markers
 */
router.get('/me/markers', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;

    const markers = await prisma.marker.findMany({
      where: { submittedBy: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        category: true,
        title: true,
        publicLatitude: true,
        publicLongitude: true,
        address: true,
        description: true,
        consensusStatus: true,
        confidenceScore: true,
        createdAt: true,
      },
    });

    res.json({ data: markers });
  } catch (error) {
    console.error('Error fetching user markers:', error);
    next(error);
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

    res.json({ data: feedback });
  } catch (error) {
    next(error);
  }
});

export default router;
