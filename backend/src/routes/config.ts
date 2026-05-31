import { Router, Request, Response } from 'express';

const router = Router();

router.get('/config', (req: Request, res: Response) => {
  res.json({
    data: {
      version: '1.0.0',
      supported_locales: ['zh-CN', 'en', 'hi'],
      default_locale: 'zh-CN',
      marker_categories: {
        risk: ['abuse', 'poison', 'trap', 'theft', 'missing_pet', 'suspicious_vehicle'],
        help: ['station', 'food_bank', 'friendly_clinic', 'helper', 'trap_support'],
      },
      feedback_types: [
        'confirm',
        'dispute',
        'support',
        'resolved',
        'still_active',
        'outdated',
        'helpful',
        'not_helpful',
      ],
      map_config: {
        default_center: { lat: 39.9042, lng: 116.4074 },
        default_zoom: 12,
        default_radius: 3000,
        max_radius: 50000,
      },
      rate_limits: {
        submit_marker: { window_ms: 900000, max_requests: 5 },
        submit_feedback: { window_ms: 900000, max_requests: 10 },
      },
    },
  });
});

export default router;
