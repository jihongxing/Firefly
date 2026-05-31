import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../config/database';

const router = Router();

/**
 * GET /api/admin/reports
 * Get all pending reports (admin only)
 */
router.get('/reports', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return res.status(403).json({
        error: { message: 'Forbidden: Admin access required' }
      });
    }

    const reports = await prisma.markerReport.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: {
        marker: {
          select: {
            id: true,
            title: true,
            category: true,
            address: true,
          },
        },
        reporter: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    res.json({ data: reports });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/reports/:id/review
 * Review a report (admin only)
 */
router.post('/reports/:id/review', authMiddleware, async (req, res, next) => {
  try {
    const reportId = parseInt(req.params.id);
    const userId = (req as any).user?.userId;
    const { action, adminNote } = req.body; // action: 'approve' | 'reject' | 'hide_marker'

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return res.status(403).json({
        error: { message: 'Forbidden: Admin access required' }
      });
    }

    // Get report
    const report = await prisma.markerReport.findUnique({
      where: { id: reportId },
      include: { marker: true },
    });

    if (!report) {
      return res.status(404).json({
        error: { message: 'Report not found' }
      });
    }

    // Update report status
    const updatedReport = await prisma.markerReport.update({
      where: { id: reportId },
      data: {
        status: action === 'approve' ? 'resolved' : 'rejected',
        reviewedBy: userId,
        reviewedAt: new Date(),
        adminNote,
      },
    });

    // If approved and action is hide_marker, hide the marker
    if (action === 'hide_marker') {
      await prisma.marker.update({
        where: { id: report.markerId },
        data: {
          visibility: 'hidden',
          reviewStatus: 'rejected',
        },
      });
    }

    res.json({
      data: {
        id: updatedReport.id,
        status: updatedReport.status,
        reviewedAt: updatedReport.reviewedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
