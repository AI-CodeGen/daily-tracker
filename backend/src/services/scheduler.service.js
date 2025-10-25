import cron from 'node-cron';
import { createLogger } from '../config/logger.js';
const Logger = createLogger(import.meta.url);
import Snapshot from '../models/Snapshot.js';
import { fetchQuote } from './fetch.service.js';
import { sendThresholdAlert } from './alert.service.js';
import { alertEmitter } from '../events/alertEmitter.js';
import AlertHistory from '../models/AlertHistory.js';
import Asset from '../models/Asset.js';

const COOLDOWN_MS = 1000 * 60 * 60 * 2; // 2 hours

async function processAsset(asset) {
  Logger.info(`processAsset :: processing asset - ${JSON.stringify(asset)}`);
  try {
    const quote = await fetchQuote(asset.providerSymbol);
    // Create a snapshot of the current price
    const snap = await Snapshot.create({
      asset: asset._id,
      name: asset.name,
      price: quote.price,
      changePercent: quote.changePercent,
      unit: quote.unit ?? asset.unit,
      currency: asset.currency || quote.currency || 'INR',
      takenAt: new Date(),
      raw: quote.raw,
    });

    Logger.info(`processAsset :: Fetched quote for ${asset.name} - ${asset.symbol} : ${JSON.stringify(snap)}`);

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
        Logger.info(`processAsset :: Sending alert for asset ${asset.name} - ${asset.symbol} at price ${quote.price}`);
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
        }).catch((err) => Logger.error(`AlertHistory create failed - ${err.message}`));
      }
    }

    return snap;
  } catch (err) {
    Logger.error(`Scheduler asset error - ${asset.symbol} - ${err.message}`);
  }
}

export async function runCycle() {
  Logger.info('[Scheduler] Running fetch cycle (manual)', new Date().toISOString());
  const assets = await Asset.find();
  Logger.info(`runCycle :: fetched assets to process - ${JSON.stringify(assets)}`);

  for (const asset of assets) {
    await processAsset(asset);
  }
}

export function startScheduler() {
  const expr = process.env.CRON_EXPR || '*/30 * * * *';
  cron.schedule(
    expr,
    async () => {
      await runCycle();
    },
    { timezone: 'UTC' }
  );
  Logger.info('Scheduler started with expr', expr);
}
