import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Asset from '../src/models/Asset.js';
import User from '../src/models/User.js';
import { createLogger } from '../src/config/logger.js';

const Logger = createLogger(import.meta.url);

dotenv.config({ path: '.env' });

async function run() {
  Logger.info('Starting seed script for establish clean Day-Zero database...');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dailytracker');
  Logger.info('Connected to MongoDB for seeding');
  const defaults = [
    { name: 'Nifty 50', symbol: 'NIFTY', providerSymbol: '^NSEI', isGlobal: true },
    { name: 'Sensex', symbol: 'SENSEX', providerSymbol: '^BSESN', isGlobal: true },
    { name: 'Gold', symbol: 'GOLD', providerSymbol: 'GOLD', isGlobal: true },
  ];
  for (const def of defaults) {
    // eslint-disable-next-line no-await-in-loop
    await Asset.updateOne({ symbol: def.symbol }, { $setOnInsert: def }, { upsert: true });
  }
  Logger.info('Default global assets seeded.');

  const adminUser = {
    googleId: "113620215249742925911",
    email: "gu366d@gmail.com",
    name: "Google User",
    picture: "https://lh3.googleusercontent.com/a/ACg8ocKs3hcHHwSVqyDlhSvlDgbiU1EgCwj1m-5KAE_EQbNUJSeZIA=s96-c",
    isActive: true,
    role: "admin"
  };

  await User.updateOne(
    { googleId: adminUser.googleId },
    { $set: adminUser },
    { upsert: true }
  );
  Logger.info('Admin user seeded.');

  Logger.info('*** Seeding process completed! ***');
  await mongoose.disconnect();
}

run().catch(e => { Logger.error('Seeding failed due to - ', e); process.exit(1); });
