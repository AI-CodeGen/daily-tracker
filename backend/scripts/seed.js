import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Asset from '../src/models/Asset.js';

dotenv.config({ path: '.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dailytracker');
  console.log('Connected for seed');
  const defaults = [
    { name: 'Nifty 50', symbol: 'NIFTY', providerSymbol: '^NSEI', isGlobal: true },
    { name: 'Sensex', symbol: 'SENSEX', providerSymbol: '^BSESN', isGlobal: true },
    { name: 'Gold', symbol: 'GOLD', providerSymbol: 'GC=F', isGlobal: true },
    { name: 'Silver', symbol: 'SILVER', providerSymbol: 'SI=F', isGlobal: true },
  ];
  for (const def of defaults) {
    // eslint-disable-next-line no-await-in-loop
    await Asset.updateOne({ symbol: def.symbol }, { $setOnInsert: def }, { upsert: true });
  }
  console.log('Seed complete');
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
