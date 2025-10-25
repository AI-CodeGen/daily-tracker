import Snapshot from '../models/Snapshot.js';
import Asset from '../models/Asset.js';
import { createLogger } from '../config/logger.js';
const Logger = createLogger(import.meta.url);

export async function currentQuotes(req, res, next) {
  try {
    const query = {
      $or: [{ isGlobal: true }],
    };
    if (req.user) {
      query.$or.push({ userId: req.user._id });
    }
    Logger.info(`Fetching current quotes for user=${req.user?._id || 'guest'} with query=${JSON.stringify(query)}`);

    const assets = await Asset.find(query);
    const assetIds = assets.map(a => a._id);

    const latestSnapshots = await Snapshot.aggregate([
      { $match: { asset: { $in: assetIds } } },
      { $sort: { takenAt: -1 } },
      {
        $group: {
          _id: '$asset',
          doc: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$doc' } },
    ]);

    const snapMap = new Map(latestSnapshots.map(s => [s.asset.toString(), s]));

    const data = assets.map(asset => {
      const snap = snapMap.get(asset._id.toString());
      return {
        assetId: asset._id,
        symbol: asset.symbol,
        name: asset.name,
        price: snap?.price || 0,
        unit: snap?.unit || asset.unit || null,
        currency: snap?.currency || asset.currency || 'INR',
        changePercent: snap?.changePercent || 0,
        takenAt: snap?.takenAt || null,
      };
    });

    Logger.info(`Fetched current quotes for user=${req.user?._id || 'guest'} with formatted data=${JSON.stringify(data)}`);
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function assetHistory(req, res, next) {
  try {
    const { id } = req.params;
    const { limit = 200 } = req.query;
    const snaps = await Snapshot.find({ asset: id }).sort({ takenAt: -1 }).limit(Number(limit));
    Logger.info(`Fetched history for asset=${id} count=${snaps.length} limit=${limit}`);
    res.json(snaps.reverse()); // chronological ascending
  } catch (e) { next(e); }
}
