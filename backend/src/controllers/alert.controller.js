import { createLogger } from "../config/logger.js";
const Logger = createLogger(import.meta.url);

// GET /api/alerts/history?assetId=&symbol=&boundary=upper|lower&page=1&pageSize=20
export async function listAlerts(req, res, next) {
  try {
    const { assetId, symbol, boundary, page = 1, pageSize = 20 } = req.query;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(200, Math.max(1, parseInt(pageSize, 10) || 20));
    const q = {};
    if (assetId) q.asset = assetId;
    if (symbol) q.symbol = { $regex: `^${symbol}$`, $options: 'i' };
    if (boundary && ['upper', 'lower'].includes(boundary)) q.boundary = boundary;

    const [items, total] = await Promise.all([
      AlertHistory.find(q)
        .sort({ triggeredAt: -1 })
        .skip((p - 1) * ps)
        .limit(ps),
      AlertHistory.countDocuments(q),
    ]);

    res.json({
      data: items,
      page: p,
      pageSize: ps,
      total,
      totalPages: Math.ceil(total / ps) || 1,
    });
  } catch (e) { next(e); }
}