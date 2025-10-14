import mongoose from "mongoose";

const snapshotSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },
    name: { type: String, required: true }, // Denormalized for convenience
    price: { type: Number, required: true },
    changePercent: { type: Number },
    unit: { type: String },

    raw: { type: Object },
    takenAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

snapshotSchema.index({ asset: 1, takenAt: -1 });

export default mongoose.model("Snapshot", snapshotSchema);
