import { Router } from 'express';
import { listAssets, createAsset, updateAsset, deleteAsset, batchImport } from '../controllers/asset.controller.js';
import { currentQuotes, assetHistory } from '../controllers/quote.controller.js';
import { runCycle } from '../services/scheduler.service.js';
import { alertEmitter } from '../events/alertEmitter.js';
import { listAlerts } from '../controllers/alert.controller.js';

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

router.get('/assets', listAssets);
router.post('/assets', createAsset);
router.put('/assets/:id', updateAsset);
router.delete('/assets/:id', deleteAsset);
router.post('/assets/batch', batchImport);

router.get('/quotes/current', currentQuotes);
router.get('/quotes/:id/history', assetHistory);
router.get('/alerts/history', listAlerts);

// Dev utility: trigger immediate fetch cycle (guarded by NODE_ENV check)
router.post('/admin/fetch-now', async (req, res) => {
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
