import { Router } from 'express';
import markerController from '../controllers/markerController';
import feedbackController from '../controllers/feedbackController';
import { submitRateLimit } from '../middleware/rateLimit';

const router = Router();

router.get('/', markerController.getMarkers.bind(markerController));
router.get('/:id', markerController.getMarkerById.bind(markerController));
router.post('/submit', submitRateLimit, markerController.submitMarker.bind(markerController));
router.post('/:id/feedback', submitRateLimit, feedbackController.submitFeedback.bind(feedbackController));
router.get('/:id/feedback-summary', feedbackController.getFeedbackSummary.bind(feedbackController));

export default router;
