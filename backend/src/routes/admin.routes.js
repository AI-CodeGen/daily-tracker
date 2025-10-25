import express from 'express';
import { getRateLimit, upsertRateLimit } from '../controllers/rateLimit.controller.js';
import {
  getMasterAssets,
  createMasterAsset,
  updateMasterAsset,
  deleteMasterAsset,
} from '../controllers/masterAsset.controller.js';
import { requireAuth, admin } from '../middleware/auth.js';
import { rateLimiters } from '../middleware/rateLimiter.js';

const router = express.Router();

// All routes in this file are protected and for admins only
router.use(requireAuth, admin);

router
  .route('/rate-limits/:endpoint')
  .get(...rateLimiters, getRateLimit)
  .put(...rateLimiters, upsertRateLimit);

// Master asset management routes
router.route('/master-assets')
  .get(...rateLimiters, getMasterAssets)
  .post(...rateLimiters, createMasterAsset);

router.route('/master-assets/:id')
  .put(...rateLimiters, updateMasterAsset)
  .delete(...rateLimiters, deleteMasterAsset);

export default router;
