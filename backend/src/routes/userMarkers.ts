import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../config/database';

const router = Router();

/**
 * GET /api/users/me/markers
 * Get current user's submitted markers
 */
router.get('/me/markers', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;

    const markers = await prisma.marker.findMany({
      where: {
        submittedBy: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        category: true,
        title: true,
        address: true,
        description: true,
        publicLatitude: true,
        publicLongitude: true,
        reviewStatus: true,
        visibility: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      data: markers.map(marker => ({
        id: marker.id,
        category: marker.category,
        title: marker.title,
        address: marker.address,
        description: marker.description,
        latitude: marker.publicLatitude,
        longitude: marker.publicLongitude,
        review_status: marker.reviewStatus,
        visibility: marker.visibility,
        status: marker.status,
        created_at: marker.createdAt.toISOString(),
        updated_at: marker.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/me/feedback
 * Get current user's feedback history
 */
router.get('/me/feedback', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;

    const feedback = await prisma.feedback.findMany({
      where: {
        userId,
      },
      include: {
        marker: {
          select: {
            id: true,
            title: true,
            category: true,
            address: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    res.json({
      data: feedback.map(f => ({
        id: f.id,
        feedback_type: f.feedbackType,
        comment: f.comment,
        confidence_level: f.confidenceLevel,
        created_at: f.createdAt.toISOString(),
        marker: {
          id: f.marker.id,
          title: f.marker.title,
          category: f.marker.category,
          address: f.marker.address,
        },
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/me/markers/:id
 * Update user's own marker
 */
router.put('/me/markers/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const markerId = parseInt(req.params.id);
    const { title, description, address, category } = req.body;

    // Check if marker belongs to user
    const marker = await prisma.marker.findFirst({
      where: {
        id: markerId,
        submittedBy: userId,
      },
    });

    if (!marker) {
      return res.status(404).json({
        error: { message: '标记不存在或无权限修改' },
      });
    }

    // Update marker
    const updated = await prisma.marker.update({
      where: { id: markerId },
      data: {
        title,
        description,
        address,
        category,
      },
    });

    res.json({
      data: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        address: updated.address,
        category: updated.category,
        updated_at: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/users/me/markers/:id
 * Delete user's own marker (soft delete)
 */
router.delete('/me/markers/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const markerId = parseInt(req.params.id);

    // Check if marker belongs to user
    const marker = await prisma.marker.findFirst({
      where: {
        id: markerId,
        submittedBy: userId,
      },
    });

    if (!marker) {
      return res.status(404).json({
        error: { message: '标记不存在或无权限删除' },
      });
    }

    // Soft delete by setting status to 0
    await prisma.marker.update({
      where: { id: markerId },
      data: {
        status: 0,
      },
    });

    res.json({
      data: {
        id: markerId,
        message: '标记已删除',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
