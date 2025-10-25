import mongoose from 'mongoose';

const rateLimitSchema = new mongoose.Schema(
  {
    endpoint: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    perMinute: {
      type: Number,
      required: true,
      default: 60,
    },
    perHour: {
      type: Number,
      required: true,
      default: 1000,
    },
    perDay: {
      type: Number,
      required: true,
      default: 5000,
    },
  },
  { timestamps: true }
);

const RateLimit = mongoose.model('RateLimit', rateLimitSchema);

export default RateLimit;
