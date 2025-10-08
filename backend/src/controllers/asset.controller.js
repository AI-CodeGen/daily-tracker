import Joi from 'joi';
import Asset from '../models/Asset.js';

const assetSchema = Joi.object({
  name: Joi.string().required(),
  symbol: Joi.string().alphanum().min(2).max(12).required(),
  providerSymbol: Joi.string().required(),
  upperThreshold: Joi.number().optional().allow(null),
  lowerThreshold: Joi.number().optional().allow(null),
});

// GET /api/assets
// Query params:
// page, pageSize, sortBy (name|symbol|createdAt), sortDir (asc|desc), q (substring search), symbolExact
export async function listAssets(req, res, next) {
  try {
    const { page = 1, pageSize = 50, sortBy = 'createdAt', sortDir = 'asc', q, symbolExact } = req.query;
    // Exact symbol short-circuit for duplicate checking
    if (symbolExact) {
      const existing = await Asset.findOne({ symbol: { $regex: `^${symbolExact}$`, $options: 'i' } });
      return res.json({ exists: !!existing, asset: existing || null });
    }
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(200, Math.max(1, parseInt(pageSize, 10) || 50));
    const filter = {};
    if (q) {
      const regex = { $regex: q, $options: 'i' };
      filter.$or = [
        { name: regex },
        { symbol: regex },
        { providerSymbol: regex },
      ];
    }
    const validSort = ['name', 'symbol', 'createdAt'];
    const sField = validSort.includes(sortBy) ? sortBy : 'createdAt';
    const direction = sortDir === 'desc' ? -1 : 1;
    const [items, total] = await Promise.all([
      Asset.find(filter)
        .sort({ [sField]: direction })
        .skip((p - 1) * ps)
        .limit(ps),
      Asset.countDocuments(filter),
    ]);
    return res.json({
      data: items,
      page: p,
      pageSize: ps,
      total,
      totalPages: Math.ceil(total / ps) || 1,
      sortBy: sField,
      sortDir: direction === 1 ? 'asc' : 'desc',
      q: q || null,
    });
  } catch (e) { next(e); }
}

export async function createAsset(req, res, next) {
  try {
    const value = await assetSchema.validateAsync(req.body);
    const asset = await Asset.create(value);
    res.status(201).json(asset);
  } catch (e) { next(e); }
}

export async function updateAsset(req, res, next) {
  try {
    const { id } = req.params;
    const value = await assetSchema.fork(['symbol'], (s) => s.optional()).validateAsync(req.body);
    const updated = await Asset.findByIdAndUpdate(id, value, { new: true });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    return res.json(updated);
  } catch (e) { next(e); }
}

export async function deleteAsset(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await Asset.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    return res.json({ success: true });
  } catch (e) { next(e); }
}

// POST /api/assets/batch (CSV text in body or multipart->text field 'file')
// CSV headers: name,symbol,providerSymbol,upperThreshold,lowerThreshold
export async function batchImport(req, res, next) {
  try {
    const csv = req.body?.csv || req.body; // expecting raw text (ensure body parser configured for text if needed)
    if (typeof csv !== 'string') return res.status(400).json({ message: 'Expected CSV text' });
    const lines = csv.split(/\r?\n/).filter(l => l.trim().length);
    if (!lines.length) return res.status(400).json({ message: 'Empty CSV' });
    const header = lines.shift();
    const cols = header.split(',').map(h => h.trim());
    const required = ['name', 'symbol', 'providerSymbol'];
    for (const r of required) if (!cols.includes(r)) return res.status(400).json({ message: `Missing column ${r}` });
    const created = [];
    for (const line of lines) {
      const values = line.split(',');
      const row = {};
      cols.forEach((c, i) => { row[c] = values[i]?.trim(); });
      if (!row.symbol || !row.name || !row.providerSymbol) continue;
      const doc = {
        name: row.name,
        symbol: row.symbol,
        providerSymbol: row.providerSymbol,
      };
      if (row.upperThreshold) doc.upperThreshold = Number(row.upperThreshold);
      if (row.lowerThreshold) doc.lowerThreshold = Number(row.lowerThreshold);
      // eslint-disable-next-line no-await-in-loop
      const existing = await Asset.findOne({ symbol: row.symbol });
      if (existing) continue; // skip duplicates silently
      // eslint-disable-next-line no-await-in-loop
      const a = await Asset.create(doc);
      created.push(a);
    }
    res.status(201).json({ imported: created.length, items: created });
  } catch (e) { next(e); }
}
