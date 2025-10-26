import express from 'express';
import { getMasterAssets, searchMasterAssets } from '../controllers/masterAsset.controller.js';
import { rateLimiters } from '../middleware/rateLimiter.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.route('/').get(...rateLimiters, getMasterAssets);
router.route('/search').get(requireAuth, ...rateLimiters, searchMasterAssets);

export default router;
