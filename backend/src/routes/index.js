import { Router } from 'express';
import { listAssets, createAsset, updateAsset, deleteAsset, batchImport } from '../controllers/asset.controller.js';
import { currentQuotes, assetHistory } from '../controllers/quote.controller.js';
import { runCycle } from '../services/scheduler.service.js';
import { alertEmitter } from '../events/alertEmitter.js';
import { listAlerts } from '../controllers/alert.controller.js';
import { logout, getUser } from '../controllers/auth.controller.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { rateLimiters } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Auth API routes (not OAuth flows)
router.post('/auth/logout', ...rateLimiters, logout);
router.get('/auth/me', ...rateLimiters, optionalAuth, getUser);

// Asset routes - require authentication for modification, optional for viewing
router.get('/assets', ...rateLimiters, optionalAuth, listAssets);
router.post('/assets', ...rateLimiters, requireAuth, createAsset);
router.put('/assets/:id', ...rateLimiters, requireAuth, updateAsset);
router.delete('/assets/:id', ...rateLimiters, requireAuth, deleteAsset);
router.post('/assets/batch', ...rateLimiters, requireAuth, batchImport);

router.get('/quotes/current', ...rateLimiters, optionalAuth, currentQuotes);
router.get('/quotes/:id/history', ...rateLimiters, assetHistory);
router.get('/alerts/history', ...rateLimiters, listAlerts);

// Dev utility: trigger immediate fetch cycle (guarded by NODE_ENV check)
router.post('/admin/fetch-now', ...rateLimiters, async (req, res) => {
	if (process.env.NODE_ENV === 'production') {
		return res.status(403).json({ message: 'Forbidden' });
	}
	await runCycle();
	return res.json({ success: true });
});

// Server-Sent Events stream for threshold alerts
router.get('/stream/alerts', (req, res) => {
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');
	res.flushHeaders?.();

	const send = (payload) => {
		res.write(`event: thresholdAlert\n`);
		res.write(`data: ${JSON.stringify(payload)}\n\n`);
	};

	const listener = (payload) => send(payload);
	alertEmitter.on('thresholdAlert', listener);

	// Heartbeat keep-alive every 25s
	const heartbeat = setInterval(() => {
		res.write(`: heartbeat ${Date.now()}\n\n`);
	}, 25000);

	req.on('close', () => {
		clearInterval(heartbeat);
		alertEmitter.off('thresholdAlert', listener);
	});
});

export default router;
