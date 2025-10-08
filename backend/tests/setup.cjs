const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let appExport;

jest.setTimeout(60000);

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri('dailytracker');
  process.env.MONGO_URI = uri;
  process.env.ALLOWED_ORIGINS = '';
  // Dynamically import ESM createApp
  const { createApp } = await import('../src/app.js');
  await mongoose.connect(uri);
  appExport = createApp();
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

// Provide app via global for tests
global.__APP__ = () => appExport;