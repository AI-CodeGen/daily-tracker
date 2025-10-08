import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { startScheduler } from './services/scheduler.service.js';
import { initMailer } from './services/alert.service.js';
import { createApp } from './app.js';

dotenv.config();

const app = createApp();

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dailytracker');
  console.log('Mongo connected');
  initMailer();
  startScheduler();
  app.listen(PORT, () => console.log(`Backend listening on ${PORT}`));
}

bootstrap().catch(err => {
  console.error('Failed to start', err);
  process.exit(1);
});
