import cron from 'node-cron';
import Asset from '../models/Asset.js';
import Snapshot from '../models/Snapshot.js';
import { fetchQuote } from './fetch.service.js';
import { sendThresholdAlert } from './alert.service.js';
import { alertEmitter } from '../events/alertEmitter.js';
import AlertHistory from '../models/AlertHistory.js';

const COOLDOWN_MS = 1000 * 60 * 60 * 2; // 2 hours

async function processAsset(asset) {
  try {
    const quote = await fetchQuote(asset.providerSymbol);
    const snap = await Snapshot.create({
      asset: asset._id,
      price: quote.price,
      changePercent: quote.changePercent,
      raw: quote.raw,
    });

    let alertBoundary;
    if (asset.upperThreshold != null && quote.price >= asset.upperThreshold) {
      alertBoundary = 'upper';
    } else if (asset.lowerThreshold != null && quote.price <= asset.lowerThreshold) {
      alertBoundary = 'lower';
    }

    if (alertBoundary) {
      const now = Date.now();
      const last = asset.lastAlertedAt ? asset.lastAlertedAt.getTime() : 0;
      if (now - last > COOLDOWN_MS) {
        await sendThresholdAlert(asset, quote.price, alertBoundary);
        asset.lastAlertedAt = new Date();
        await asset.save();
        const payload = {
          assetId: asset._id.toString(),
          symbol: asset.symbol,
          name: asset.name,
          boundary: alertBoundary,
          price: quote.price,
          threshold: alertBoundary === 'upper' ? asset.upperThreshold : asset.lowerThreshold,
          time: new Date().toISOString(),
        };
        alertEmitter.emit('thresholdAlert', payload);
        // Persist history (fire & forget)
        AlertHistory.create({
          asset: asset._id,
          symbol: asset.symbol,
          name: asset.name,
          boundary: alertBoundary,
          price: quote.price,
          threshold: payload.threshold,
          triggeredAt: new Date(payload.time),
        }).catch(err => console.error('AlertHistory create failed', err.message));
      }
    }

    return snap;
  } catch (err) {
    console.error('Scheduler asset error', asset.symbol, err.message);
  }
}

export async function runCycle() {
  console.log('[Scheduler] Running fetch cycle (manual)', new Date().toISOString());
  const assets = await Asset.find();
  for (const asset of assets) {
    // eslint-disable-next-line no-await-in-loop
    await processAsset(asset);
  }
}

export function startScheduler() {
  const expr = process.env.CRON_EXPR || '*/30 * * * *';
  cron.schedule(expr, async () => {
    await runCycle();
  }, { timezone: 'UTC' });
  console.log('Scheduler started with expr', expr);
}
