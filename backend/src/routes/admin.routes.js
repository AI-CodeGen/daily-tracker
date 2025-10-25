import express from 'express';
import { getRateLimit, upsertRateLimit } from '../controllers/rateLimit.controller.js';
import { requireAuth, admin } from '../middleware/auth.js';
import { rateLimiters } from '../middleware/rateLimiter.js';

const router = express.Router();

// All routes in this file are protected and for admins only
router.use(requireAuth, admin);

router
  .route('/rate-limits/:endpoint')
  .get(...rateLimiters, getRateLimit)
  .put(...rateLimiters, upsertRateLimit);

export default router;
