import express from 'express';
import { getRateLimit, upsertRateLimit } from '../controllers/rateLimit.controller.js';
import { requireAuth, admin } from '../middleware/auth.js';

const router = express.Router();

// All routes in this file are protected and for admins only
router.use(requireAuth, admin);

router
  .route('/rate-limits/:endpoint')
  .get(getRateLimit)
  .put(upsertRateLimit);

export default router;
