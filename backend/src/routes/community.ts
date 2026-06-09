import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../config/database';

const router = Router();

/**
 * GET /api/community/reports
 * Get all reports available for voting
 */
router.get('/reports', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;

    // Get user level to check voting eligibility
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { reputationScore: true },
    });

    const points = user?.reputationScore || 0;
    const canVote = points >= 11; // Firefly level and above

    // Get reports in voting status with aggregated reasons
    const reportsRaw = await prisma.$queryRaw`
      SELECT
        r.id,
        r.marker_id,
        r.vote_status,
        r.vote_deadline,
        r.support_weight,
        r.oppose_weight,
        r.need_info_count,
        r.created_at,
        m.title as marker_title,
        m.category as marker_category,
        m.address as marker_address,
        COALESCE(rv.vote_type, NULL) as user_vote,
        EXTRACT(EPOCH FROM (r.vote_deadline - NOW())) as seconds_remaining,
        (
          SELECT json_agg(json_build_object(
            'reason', rr.reason,
            'username', u.username,
            'description', rr.description,
            'created_at', rr.created_at
          ))
          FROM report_reasons rr
          LEFT JOIN users u ON rr.user_id = u.id
          WHERE rr.report_id = r.id
        ) as reasons,
        (
          SELECT COUNT(DISTINCT user_id)::int
          FROM report_reasons
          WHERE report_id = r.id
        ) as reporter_count
      FROM reports r
      LEFT JOIN markers m ON r.marker_id = m.id
      LEFT JOIN report_votes rv ON r.id = rv.report_id AND rv.user_id = ${userId}
      WHERE r.vote_status = 'voting'
        AND r.vote_deadline > NOW()
      ORDER BY r.created_at DESC
    ` as any[];

    // Convert BigInt to Number for JSON serialization
    const reports = reportsRaw.map(report => ({
      ...report,
      id: Number(report.id),
      marker_id: Number(report.marker_id),
      support_weight: Number(report.support_weight || 0),
      oppose_weight: Number(report.oppose_weight || 0),
      need_info_count: Number(report.need_info_count || 0),
    }));

    return res.json({
      data: reports,
      canVote,
      userLevel: points >= 201 ? 'angel' : points >= 51 ? 'star' : points >= 11 ? 'firefly' : 'sprout',
    });
  } catch (error) {
    console.error('Community reports error:', error);
    return next(error);
  }
});

/**
 * POST /api/community/reports/:id/vote
 * Submit a vote on a report
 */
router.post('/reports/:id/vote', authMiddleware, async (req, res, next) => {
  try {
    const reportId = parseInt(req.params.id);
    const userId = (req as any).user?.userId;
    const { voteType, reason } = req.body; // 'support', 'oppose', 'need_info'

    // Get user level and calculate vote weight
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { reputationScore: true },
    });

    const points = user?.reputationScore || 0;

    // Check voting eligibility
    if (points < 11) {
      return res.status(403).json({
        error: { message: '需要达到萤火守护者（11分）才能投票' }
      });
    }

    // Calculate vote weight based on level
    let voteWeight = 1; // Firefly (11-50)
    if (points >= 201) voteWeight = 3; // Angel
    else if (points >= 51) voteWeight = 2; // Star

    // Check if report exists and is in voting status
    const report = await prisma.$queryRaw`
      SELECT * FROM reports
      WHERE id = ${reportId}
        AND vote_status = 'voting'
        AND vote_deadline > NOW()
    ` as any[];

    if (!report || report.length === 0) {
      return res.status(404).json({
        error: { message: '举报不存在或投票已结束' }
      });
    }

    // Insert or update vote
    await prisma.$executeRaw`
      INSERT INTO report_votes (report_id, user_id, vote_type, vote_weight, reason)
      VALUES (${reportId}, ${userId}, ${voteType}, ${voteWeight}, ${reason})
      ON CONFLICT (report_id, user_id)
      DO UPDATE SET
        vote_type = ${voteType},
        vote_weight = ${voteWeight},
        reason = ${reason}
    `;

    // Recalculate vote weights
    const voteStats = await prisma.$queryRaw`
      SELECT
        SUM(CASE WHEN vote_type = 'support' THEN vote_weight ELSE 0 END) as support_weight,
        SUM(CASE WHEN vote_type = 'oppose' THEN vote_weight ELSE 0 END) as oppose_weight,
        COUNT(CASE WHEN vote_type = 'need_info' THEN 1 END) as need_info_count
      FROM report_votes
      WHERE report_id = ${reportId}
    ` as any[];

    const stats = voteStats[0];

    // Update report with new vote counts
    await prisma.$executeRaw`
      UPDATE reports
      SET
        support_weight = ${stats.support_weight || 0},
        oppose_weight = ${stats.oppose_weight || 0},
        need_info_count = ${stats.need_info_count || 0}
      WHERE id = ${reportId}
    `;

    // Check if we should auto-decide
    const supportWeight = stats.support_weight || 0;
    const opposeWeight = stats.oppose_weight || 0;

    // Auto-decision rules
    if (supportWeight > opposeWeight * 1.5) {
      // Report approved
      await prisma.$executeRaw`
        UPDATE reports
        SET vote_status = 'approved', status = 'resolved'
        WHERE id = ${reportId}
      `;

      // Hide marker if report is approved
      await prisma.$executeRaw`
        UPDATE markers
        SET visibility = 'hidden', review_status = 'rejected'
        WHERE id = (SELECT marker_id FROM reports WHERE id = ${reportId})
      `;
    } else if (opposeWeight > supportWeight * 1.5) {
      // Report rejected
      await prisma.$executeRaw`
        UPDATE reports
        SET vote_status = 'rejected', status = 'rejected'
        WHERE id = ${reportId}
      `;
    }

    // Award points for voting
    await prisma.$executeRaw`
      UPDATE users
      SET reputation_score = reputation_score + 1
      WHERE id = ${userId}
    `;

    return res.json({
      data: {
        voteType,
        voteWeight,
        supportWeight: stats.support_weight || 0,
        opposeWeight: stats.oppose_weight || 0,
        pointsEarned: 1,
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/community/reports/:id/votes
 * Get vote statistics for a report
 */
router.get('/reports/:id/votes', async (req, res, next) => {
  try {
    const reportId = parseInt(req.params.id);

    const stats = await prisma.$queryRaw`
      SELECT
        r.support_weight,
        r.oppose_weight,
        r.need_info_count,
        r.vote_deadline,
        r.vote_status,
        COUNT(rv.id) as total_votes,
        COUNT(CASE WHEN rv.vote_weight = 3 THEN 1 END) as angel_votes,
        COUNT(CASE WHEN rv.vote_weight = 2 THEN 1 END) as star_votes,
        COUNT(CASE WHEN rv.vote_weight = 1 THEN 1 END) as firefly_votes
      FROM reports r
      LEFT JOIN report_votes rv ON r.id = rv.report_id
      WHERE r.id = ${reportId}
      GROUP BY r.id
    ` as any[];

    if (!stats || stats.length === 0) {
      return res.status(404).json({
        error: { message: 'Report not found' }
      });
    }

    return res.json({ data: stats[0] });
  } catch (error) {
    return next(error);
  }
});

export default router;

