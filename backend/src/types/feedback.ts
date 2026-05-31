import { z } from 'zod';

export const FeedbackType = z.enum([
  'confirm',
  'dispute',
  'support',
  'resolved',
  'still_active',
  'outdated',
  'helpful',
  'not_helpful',
]);

export const SubmitFeedbackSchema = z.object({
  feedbackType: FeedbackType,
  comment: z.string().max(500).optional(),
  confidenceLevel: z.number().min(1).max(5).default(3),
});

export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackSchema>;
