import { Router } from 'express';
import { getMasterAssets, searchMasterAssets } from '../controllers/masterAsset.controller.js';
import { rateLimiters } from '../middleware/rateLimiter.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.route('/').get(rateLimiters, getMasterAssets);
router.route('/search').get(rateLimiters, requireAuth, searchMasterAssets);

export default router;
