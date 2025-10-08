import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { startScheduler } from '../src/services/scheduler.service.js';

jest.setTimeout(60000);

let mongod;
export let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri('dailytracker');
  process.env.MONGO_URI = uri;
  process.env.ALLOWED_ORIGINS = '';
  await mongoose.connect(uri);
  app = createApp();
  // Avoid starting cron in tests (optional) - comment out to test scheduler
  // startScheduler();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const c of collections) {
    await c.deleteMany({});
  }
});