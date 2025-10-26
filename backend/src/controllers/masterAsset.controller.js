import MasterAsset from '../models/MasterAsset.js';
import Asset from '../models/Asset.js';
import { createLogger } from '../config/logger.js';

const Logger = createLogger(import.meta.url);

// @desc    Get all master assets
// @route   GET /api/admin/master-assets
// @access  Admin
export async function getMasterAssets(req, res, next) {
  try {
    const assets = await MasterAsset.find({});
    res.json(assets);
  } catch (e) {
    next(e);
  }
}

// @desc    Create a master asset
// @route   POST /api/admin/master-assets
// @access  Admin
export async function createMasterAsset(req, res, next) {
  try {
    const { name, symbol, providerSymbol, unit, currency } = req.body;

    const assetExists = await MasterAsset.findOne({ symbol });

    if (assetExists) {
      res.status(400);
      throw new Error('Master asset with this symbol already exists');
    }

    const asset = await MasterAsset.create({
      name,
      symbol,
      providerSymbol,
      unit,
      currency,
    });

    res.status(201).json(asset);
  } catch (e) {
    next(e);
  }
}

// @desc    Update a master asset
// @route   PUT /api/admin/master-assets/:id
// @access  Admin
export async function updateMasterAsset(req, res, next) {
  try {
    const { name, symbol, providerSymbol, unit, currency } = req.body;

    const asset = await MasterAsset.findById(req.params.id);

    if (asset) {
      // Check if symbol is being changed and if the new one already exists
      if (symbol && symbol !== asset.symbol) {
        const assetExists = await MasterAsset.findOne({ symbol });
        if (assetExists) {
          res.status(400);
          throw new Error('Master asset with this symbol already exists');
        }
      }

      asset.name = name || asset.name;
      asset.symbol = symbol || asset.symbol;
      asset.providerSymbol = providerSymbol || asset.providerSymbol;
      asset.unit = unit || asset.unit;
      asset.currency = currency || asset.currency;

      const updatedAsset = await asset.save();
      res.json(updatedAsset);
    } else {
      res.status(404);
      throw new Error('Master asset not found');
    }
  } catch (e) {
    next(e);
  }
}

// @desc    Delete a master asset
// @route   DELETE /api/admin/master-assets/:id
// @access  Admin
export async function deleteMasterAsset(req, res, next) {
  try {
    const asset = await MasterAsset.findById(req.params.id);

    if (asset) {
      await asset.remove();
      res.json({ message: 'Master asset removed' });
    } else {
      res.status(404);
      throw new Error('Master asset not found');
    }
  } catch (e) {
    next(e);
  }
}

export async function searchMasterAssets(req, res, next) {
  try {
    const { q } = req.query;
    const userId = req.user._id;

    if (!q) {
      return res.json([]);
    }

    // Find master assets matching the query
    const masterAssets = await MasterAsset.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { symbol: { $regex: q, $options: 'i' } },
      ],
    }).limit(20);

    // Get symbols of assets the user already has
    const userAssets = await Asset.find({ userId }).select('symbol -_id');
    const userSymbols = userAssets.map((a) => a.symbol);

    // Filter out master assets that the user already has
    const availableAssets = masterAssets.filter((m) => !userSymbols.includes(m.symbol));

    res.json(availableAssets);
  } catch (e) {
    next(e);
  }
}
