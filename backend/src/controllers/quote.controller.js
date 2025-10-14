import Snapshot from '../models/Snapshot.js';
import Asset from '../models/Asset.js';

export async function currentQuotes(req, res, next) {
  try {
    const assets = await Asset.find();
    const data = [];
    for (const asset of assets) {
      // Latest snapshot
      // eslint-disable-next-line no-await-in-loop
      const snap = await Snapshot.findOne({ asset: asset._id }).sort({ takenAt: -1 });
      if (snap) {
        data.push({
          assetId: asset._id,
          symbol: asset.symbol,
          name: asset.name,
          price: snap.price,
          unit: snap.unit || asset.unit || null,
          currency: snap.currency || asset.currency || 'INR',
          changePercent: snap.changePercent,
          takenAt: snap.takenAt,
        });
      }
    }
    res.json(data);
  } catch (e) { next(e); }
}

export async function assetHistory(req, res, next) {
  try {
    const { id } = req.params;
    const { limit = 200 } = req.query;
    const snaps = await Snapshot.find({ asset: id }).sort({ takenAt: -1 }).limit(Number(limit));
    res.json(snaps.reverse()); // chronological ascending
  } catch (e) { next(e); }
}
