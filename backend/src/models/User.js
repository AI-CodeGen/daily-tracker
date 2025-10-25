import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  picture: { type: String },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('User', userSchema);