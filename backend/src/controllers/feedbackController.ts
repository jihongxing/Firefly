import { Request, Response, NextFunction } from 'express';
import feedbackService from '../services/feedbackService';
import { SubmitFeedbackSchema } from '../types/feedback';
import { AppError } from '../middleware/errorHandler';

export class FeedbackController {
  /**
   * POST /api/markers/:id/feedback
   */
  async submitFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const markerId = parseInt(req.params.id);
      if (isNaN(markerId)) {
        throw new AppError(400, 'Invalid marker ID', 'INVALID_PARAMS');
      }

      const data = SubmitFeedbackSchema.parse(req.body);

      const result = await feedbackService.submitFeedback(
        markerId,
        data,
        req.ip || '127.0.0.1',
        req.get('user-agent') || 'unknown'
      );

      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/markers/:id/feedback-summary
   */
  async getFeedbackSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const markerId = parseInt(req.params.id);
      if (isNaN(markerId)) {
        throw new AppError(400, 'Invalid marker ID', 'INVALID_PARAMS');
      }

      const summary = await feedbackService.getFeedbackSummary(markerId);
      res.json({ data: summary });
    } catch (error) {
      next(error);
    }
  }
}

export default new FeedbackController();
