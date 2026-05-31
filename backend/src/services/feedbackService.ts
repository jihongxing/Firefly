import prisma from '../config/database';
import { SubmitFeedbackInput } from '../types/feedback';

export class FeedbackService {
  /**
   * Submit feedback for a marker
   */
  async submitFeedback(
    markerId: number,
    data: SubmitFeedbackInput,
    ipAddress: string,
    userAgent: string,
    userId?: number
  ) {
    const feedback = await prisma.feedback.create({
      data: {
        markerId,
        userId,
        feedbackType: data.feedbackType,
        comment: data.comment,
        confidenceLevel: data.confidenceLevel,
        ipAddress,
        userAgent,
      },
    });

    // Update marker consensus scores
    await this.updateMarkerConsensus(markerId);

    return {
      id: feedback.id,
      feedback_type: feedback.feedbackType,
      created_at: feedback.createdAt.toISOString(),
    };
  }

  /**
   * Get feedback summary for a marker
   */
  async getFeedbackSummary(markerId: number) {
    const feedbacks = await prisma.feedback.findMany({
      where: { markerId },
      select: {
        feedbackType: true,
        confidenceLevel: true,
      },
    });

    const summary = feedbacks.reduce(
      (acc, fb) => {
        acc[fb.feedbackType] = (acc[fb.feedbackType] || 0) + 1;
        acc.total++;
        return acc;
      },
      { total: 0 } as Record<string, number>
    );

    return {
      marker_id: markerId,
      feedback_count: summary.total,
      breakdown: summary,
    };
  }

  /**
   * Update marker consensus status based on feedback
   */
  private async updateMarkerConsensus(markerId: number) {
    const feedbacks = await prisma.feedback.findMany({
      where: { markerId },
    });

    if (feedbacks.length === 0) return;

    let supportScore = 0;
    let disputeScore = 0;

    feedbacks.forEach((fb) => {
      const weight = fb.confidenceLevel / 5;

      if (['confirm', 'support', 'helpful'].includes(fb.feedbackType)) {
        supportScore += weight;
      } else if (['dispute', 'not_helpful', 'outdated'].includes(fb.feedbackType)) {
        disputeScore += weight;
      }
    });

    const total = supportScore + disputeScore;
    const confidenceScore = total > 0 ? supportScore / total : 0;

    let consensusStatus: string;
    if (feedbacks.length < 3) {
      consensusStatus = 'pending';
    } else if (confidenceScore >= 0.7) {
      consensusStatus = 'verified';
    } else if (confidenceScore <= 0.3) {
      consensusStatus = 'disputed';
    } else {
      consensusStatus = 'pending';
    }

    await prisma.marker.update({
      where: { id: markerId },
      data: {
        supportScore,
        disputeScore,
        confidenceScore,
        consensusStatus,
      },
    });
  }
}

export default new FeedbackService();
