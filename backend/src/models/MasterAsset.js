import mongoose from 'mongoose';

const masterAssetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  symbol: { type: String, required: true, unique: true }, // internal short symbol
  providerSymbol: { type: String, required: true }, // symbol used for provider API (e.g., ^NSEI)
  unit: { type: String }, // e.g., "per 10gm", "per barrel"
  currency: { type: String, default: 'INR' }, // ISO currency code
}, { timestamps: true });

export default mongoose.model('MasterAsset', masterAssetSchema);
