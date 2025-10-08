import mongoose from 'mongoose';

const alertHistorySchema = new mongoose.Schema({
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  symbol: { type: String, required: true },
  name: { type: String, required: true },
  boundary: { type: String, enum: ['upper', 'lower'], required: true },
  price: { type: Number, required: true },
  threshold: { type: Number },
  triggeredAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

alertHistorySchema.index({ asset: 1, triggeredAt: -1 });

export default mongoose.model('AlertHistory', alertHistorySchema);