import Joi from 'joi';
import { createLogger } from '../config/logger.js';
import Asset from '../models/Asset.js';
const Logger = createLogger(import.meta.url);

const assetSchema = Joi.object({
  name: Joi.string().required(),
  symbol: Joi.string().min(2).max(12).required(),
  providerSymbol: Joi.string().required(),
  unit: Joi.string().optional().allow(''),
  currency: Joi.string().trim().length(3).uppercase().optional(),
  upperThreshold: Joi.number().optional().allow(null),
  lowerThreshold: Joi.number().optional().allow(null),
  isGlobal: Joi.boolean().default(false),
  userId: Joi.string().optional() // Allow userId to be passed optionally
});

// GET /api/assets
// Query params:
// page, pageSize, sortBy (name|symbol|createdAt), sortDir (asc|desc), q (substring search), symbolExact
export async function listAssets(req, res, next) {
  try {
    const { page = 1, pageSize = 50, sortBy = 'createdAt', sortDir = 'asc', q, symbolExact } = req.query;

    Logger.info(
      `Listing assets: user=${req.user?._id || 'guest'} page=${page} pageSize=${pageSize} sortBy=${sortBy} sortDir=${sortDir} q=${q || ''} symbolExact=${symbolExact || ''}`
    );
    // Exact symbol short-circuit for duplicate checking
    if (symbolExact) {
      const userId = req.user?._id;
      // Check if symbol exists for this user or globally
      const existing = await Asset.findOne({
        symbol: { $regex: `^${symbolExact}$`, $options: 'i' },
        $or: [{ isGlobal: true }, { userId: userId }],
      });
      return res.json({ exists: !!existing, asset: existing || null });
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(200, Math.max(1, parseInt(pageSize, 10) || 50));
    const filter = {};

    // Filter by user ownership - show global assets and user's own assets
    if (req.user) {
      filter.$or = [{ isGlobal: true }, { userId: req.user._id }];
    } else {
      // Only show global assets for unauthenticated users
      filter.isGlobal = true;
    }

    if (q) {
      const regex = { $regex: q, $options: 'i' };
      const searchFilter = {
        $or: [{ name: regex }, { symbol: regex }, { providerSymbol: regex }],
      };

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, searchFilter];
        delete filter.$or;
      } else {
        filter.$or = searchFilter.$or;
      }
    }

    const validSort = ['name', 'symbol', 'createdAt'];
    const sField = validSort.includes(sortBy) ? sortBy : 'createdAt';
    const direction = sortDir === 'desc' ? -1 : 1;
    const [items, total] = await Promise.all([
      Asset.find(filter)
        .populate('userId', 'name email')
        .sort({ [sField]: direction })
        .skip((p - 1) * ps)
        .limit(ps),
      Asset.countDocuments(filter),
    ]);
    const responsePayload = {
      data: items,
      page: p,
      pageSize: ps,
      total,
      totalPages: Math.ceil(total / ps) || 1,
      sortBy: sField,
      sortDir: direction === 1 ? 'asc' : 'desc',
      q: q || null,
    };
    Logger.info(
      `Listed assets: user=${
        req.user?._id || 'guest'
      } returned=${items.length} total=${total}. Detailed response: ${JSON.stringify(responsePayload)}`
    );
    return res.json(responsePayload);
  } catch (e) {
    Logger.error(`Error listing assets: ${e.message}`);
    next(e);
  }
}

export async function createAsset(req, res, next) {
  try {
    const value = await assetSchema.validateAsync(req.body);
    Logger.info(`Creating asset for user=${req.user._id} symbol=${JSON.stringify(value)}`);

    // Check if symbol already exists for this user
    const existing = await Asset.findOne({
      symbol: value.symbol,
      $or: [{ isGlobal: true }, { userId: req.user._id }],
    });

    if (existing) {
      return res.status(400).json({ message: 'Symbol already exists' });
    }

    // Add user ownership only if not provided in request body
    if (!value.userId) {
      value.userId = req.user._id; // User Id is added from authenticated user
    }
    value.isGlobal = false; // User assets are not global by default

    const asset = await Asset.create(value);
    Logger.info(`Asset created successfully: user=${req.user._id} assetId=${asset._id}`);
    res.status(201).json(asset);
  } catch (e) {
    next(e);
  }
}

export async function updateAsset(req, res, next) {
  try {
    const { id } = req.params;
    const value = await assetSchema.fork(['symbol'], (s) => s.optional()).validateAsync(req.body);
    Logger.info(`Updating asset for user=${req.user._id} assetId=${id} updates=${JSON.stringify(value)}`);

    // Find the asset first to check ownership
    const asset = await Asset.findById(id);
    if (!asset) return res.status(404).json({ message: 'Not found' });

    // Only allow editing user's own assets, not global assets
    if (asset.isGlobal || (asset.userId && asset.userId.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'Cannot edit this asset' });
    }

    const updated = await Asset.findByIdAndUpdate(id, value, { new: true });
    Logger.info(`Asset updated successfully: user=${req.user._id} assetId=${id}`);
    return res.json(updated);
  } catch (e) {
    next(e);
  }
}

export async function deleteAsset(req, res, next) {
  try {
    const { id } = req.params;
    Logger.info(`Deleting asset for user=${req.user._id} assetId=${id}`);

    // Find the asset first to check ownership
    const asset = await Asset.findById(id);
    if (!asset) return res.status(404).json({ message: 'Not found' });

    // Only allow deleting user's own assets, not global assets
    if (asset.isGlobal || (asset.userId && asset.userId.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'Cannot delete this asset' });
    }

    await Asset.findByIdAndDelete(id);
    Logger.info(`Asset deleted successfully: user=${req.user._id} assetId=${id}`);
    return res.json({ success: true });
  } catch (e) {
    next(e);
  }
}

// POST /api/assets/batch (CSV text in body or multipart->text field 'file')
// CSV headers: name,symbol,providerSymbol,upperThreshold,lowerThreshold
export async function batchImport(req, res, next) {
  try {
    Logger.info(`Batch importing assets for user=${req.user._id}`);
    const csv = req.body?.csv || req.body; // expecting raw text (ensure body parser configured for text if needed)
    if (typeof csv !== 'string') return res.status(400).json({ message: 'Expected CSV text' });
    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length);
    if (!lines.length) return res.status(400).json({ message: 'Empty CSV' });
    const header = lines.shift();
    const cols = header.split(',').map((h) => h.trim());
    const required = ['name', 'symbol', 'providerSymbol'];
    for (const r of required) if (!cols.includes(r)) return res.status(400).json({ message: `Missing column ${r}` });
    const created = [];
    for (const line of lines) {
      const values = line.split(',');
      const row = {};
      cols.forEach((c, i) => {
        row[c] = values[i]?.trim();
      });
      if (!row.symbol || !row.name || !row.providerSymbol) continue;
      const doc = {
        name: row.name,
        symbol: row.symbol,
        providerSymbol: row.providerSymbol,
        unit: row.unit || undefined,
        currency: row.currency ? row.currency.toUpperCase() : undefined,
      };
      if (row.upperThreshold) doc.upperThreshold = Number(row.upperThreshold);
      if (row.lowerThreshold) doc.lowerThreshold = Number(row.lowerThreshold);
      // eslint-disable-next-line no-await-in-loop
      const existing = await Asset.findOne({
        symbol: row.symbol,
        $or: [{ isGlobal: true }, { userId: req.user._id }],
      });
      if (existing) continue; // skip duplicates silently

      // Add user ownership for batch import
      doc.userId = req.user._id;
      doc.isGlobal = false;

      // eslint-disable-next-line no-await-in-loop
      const a = await Asset.create(doc);
      created.push(a);
    }
    Logger.info(`Batch import completed for user=${req.user._id}, created=${created.length} assets. Detailed list: ${JSON.stringify(created)}`);
    res.status(201).json({ imported: created.length, items: created });
  } catch (e) {
    Logger.error(`Batch import error for user=${req.user._id} with error: ${e.message}`);
    next(e);
  }
}
