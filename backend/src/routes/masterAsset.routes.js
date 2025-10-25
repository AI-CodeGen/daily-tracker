import express from 'express';
import { getMasterAssets } from '../controllers/masterAsset.controller.js';
import { rateLimiters } from '../middleware/rateLimiter.js';

const router = express.Router();

router.route('/').get(...rateLimiters, getMasterAssets);

export default router;
