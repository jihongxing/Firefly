import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../config/database';

const router = Router();

/**
 * GET /api/users/me/points
 * Get current user's points and level
 */
router.get('/me/points', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        reputationScore: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    // Calculate level based on reputation score
    const points = user.reputationScore;
    let level = 'sprout'; // 新芽守护者
    let levelName = '新芽守护者';
    let nextLevel = 'firefly';
    let nextLevelPoints = 11;

    if (points >= 201) {
      level = 'angel';
      levelName = '守护天使';
      nextLevel = null;
      nextLevelPoints = null;
    } else if (points >= 51) {
      level = 'star';
      levelName = '星光守护者';
      nextLevel = 'angel';
      nextLevelPoints = 201;
    } else if (points >= 11) {
      level = 'firefly';
      levelName = '萤火守护者';
      nextLevel = 'star';
      nextLevelPoints = 51;
    }

    // Calculate stats
    const markerCount = await prisma.marker.count({
      where: { submittedBy: userId, status: 1 },
    });
    const feedbackCount = await prisma.feedback.count({
      where: { userId },
    });

    const daysActive = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    res.json({
      data: {
        points,
        level,
        levelName,
        nextLevel,
        nextLevelPoints,
        pointsToNextLevel: nextLevelPoints ? nextLevelPoints - points : null,
        stats: {
          daysActive,
          markersSubmitted: markerCount,
          feedbackGiven: feedbackCount,
          thanksReceived: 0, // TODO: Implement thanks system
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/me/badges
 * Get current user's badges
 */
router.get('/me/badges', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;

    const markerCount = await prisma.marker.count({
      where: { submittedBy: userId, status: 1 },
    });
    const feedbackCount = await prisma.feedback.count({
      where: { userId },
    });

    // Calculate which badges user has earned
    const badges = [];

    // Action badges
    if (feedbackCount >= 100) {
      badges.push({
        id: 'hundred_guardian',
        name: '百次守护',
        icon: '💯',
        category: 'action',
        description: '提交100次反馈',
      });
    }

    if (feedbackCount >= 1) {
      badges.push({
        id: 'first_responder',
        name: '第一响应者',
        icon: '🚨',
        category: 'action',
        description: '第一个确认紧急标记',
      });
    }

    // Love badges
    if (markerCount >= 10) {
      badges.push({
        id: 'feeding_angel',
        name: '喂食天使',
        icon: '🍖',
        category: 'love',
        description: '标记10个喂食点',
      });
    }

    // Special badges
    if (markerCount >= 50) {
      badges.push({
        id: 'recorder',
        name: '记录者',
        icon: '📸',
        category: 'special',
        description: '上传50张照片',
      });
    }

    res.json({
      data: {
        badges,
        total: badges.length,
        categories: {
          action: badges.filter((b) => b.category === 'action').length,
          love: badges.filter((b) => b.category === 'love').length,
          special: badges.filter((b) => b.category === 'special').length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/markers/:id/report
 * Report a marker (with merge logic)
 */
router.post('/:id/report', authMiddleware, async (req, res, next) => {
  try {
    const markerId = parseInt(req.params.id);
    const userId = (req as any).user?.userId;
    const { reason, description } = req.body;

    // Check if marker exists
    const marker = await prisma.marker.findUnique({
      where: { id: markerId },
    });

    if (!marker) {
      return res.status(404).json({ error: { message: 'Marker not found' } });
    }

    // Check for existing active report on this marker
    const existingReport = await prisma.$queryRaw`
      SELECT * FROM reports
      WHERE marker_id = ${markerId}
        AND vote_status = 'voting'
        AND vote_deadline > NOW()
      LIMIT 1
    ` as any[];

    if (existingReport && existingReport.length > 0) {
      const reportId = existingReport[0].id;

      // Check if this user already reported this marker
      const alreadyReported = await prisma.$queryRaw`
        SELECT * FROM report_reasons
        WHERE report_id = ${reportId} AND user_id = ${userId}
      ` as any[];

      if (alreadyReported && alreadyReported.length > 0) {
        return res.status(400).json({
          error: { message: '你已经举报过这个标记了' }
        });
      }

      // Add new reason to existing report
      await prisma.$executeRaw`
        INSERT INTO report_reasons (report_id, user_id, reason, description)
        VALUES (${reportId}, ${userId}, ${reason}, ${description})
      `;

      res.json({
        data: {
          id: reportId,
          merged: true,
          status: 'voting',
          message: '你的举报已添加到现有投票中',
        },
      });
    } else {
      // Create new report using raw SQL to avoid Prisma issues
      const newReportResult = await prisma.$queryRaw`
        INSERT INTO reports (marker_id, user_id, report_type, reason, status, ip_address, vote_status, vote_deadline, created_at)
        VALUES (${markerId}, ${userId}, 'marker', ${reason}, 'pending', ${req.ip || '0.0.0.0'}, 'voting', NOW() + INTERVAL '48 hours', NOW())
        RETURNING id, status, created_at
      ` as any[];

      const newReport = newReportResult[0];

      // Add reason to report_reasons table
      await prisma.$executeRaw`
        INSERT INTO report_reasons (report_id, user_id, reason, description)
        VALUES (${newReport.id}, ${userId}, ${reason}, ${description})
      `;

      res.json({
        data: {
          id: newReport.id,
          merged: false,
          status: newReport.status,
          createdAt: newReport.created_at,
        },
      });
    }
  } catch (error) {
    console.error('Report creation error:', error);
    next(error);
  }
});

export default router;
