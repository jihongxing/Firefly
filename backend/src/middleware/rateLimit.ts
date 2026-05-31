import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const globalRateLimit = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS),
  max: parseInt(env.RATE_LIMIT_MAX_REQUESTS),
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const submitRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many submissions, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
