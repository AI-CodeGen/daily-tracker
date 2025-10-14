import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  symbol: { type: String, required: true }, // internal short symbol
  providerSymbol: { type: String, required: true }, // symbol used for provider API (e.g., ^NSEI)
  unit: { type: String }, // e.g., "per 10gm", "per barrel"
  upperThreshold: { type: Number },
  lowerThreshold: { type: Number },
  lastAlertedAt: { type: Date },
}, { timestamps: true });

assetSchema.index({ symbol: 1 }, { unique: true });

export default mongoose.model('Asset', assetSchema);
