import MasterAsset from '../models/MasterAsset.js';

// A simple wrapper to catch errors from async Express route handlers
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// @desc    Get all master assets
// @route   GET /api/admin/master-assets
// @access  Admin
const getMasterAssets = asyncHandler(async (req, res) => {
  const assets = await MasterAsset.find({});
  res.json(assets);
});

// @desc    Create a master asset
// @route   POST /api/admin/master-assets
// @access  Admin
const createMasterAsset = asyncHandler(async (req, res) => {
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
});

// @desc    Update a master asset
// @route   PUT /api/admin/master-assets/:id
// @access  Admin
const updateMasterAsset = asyncHandler(async (req, res) => {
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
});

// @desc    Delete a master asset
// @route   DELETE /api/admin/master-assets/:id
// @access  Admin
const deleteMasterAsset = asyncHandler(async (req, res) => {
  const asset = await MasterAsset.findById(req.params.id);

  if (asset) {
    await asset.remove();
    res.json({ message: 'Master asset removed' });
  } else {
    res.status(404);
    throw new Error('Master asset not found');
  }
});


export {
  getMasterAssets,
  createMasterAsset,
  updateMasterAsset,
  deleteMasterAsset,
};
