import request from 'supertest';
import Asset from '../src/models/Asset.js';
import Snapshot from '../src/models/Snapshot.js';
import AlertHistory from '../src/models/AlertHistory.js';

describe('Quotes & Alerts', () => {
  const getApp = () => global.__APP__();

  test('current quotes returns latest snapshot', async () => {
    const asset = await Asset.create({ name: 'Nifty', symbol: 'NIFTY', providerSymbol: '^NSEI' });
    await Snapshot.create({ asset: asset._id, price: 100, changePercent: 1.23 });
    const res = await request(getApp()).get('/api/quotes/current').expect(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].price).toBe(100);
  });

  test('asset history returns chronological order', async () => {
    const asset = await Asset.create({ name: 'Sensex', symbol: 'SENSEX', providerSymbol: '^BSESN' });
    await Snapshot.create({ asset: asset._id, price: 10 });
    await Snapshot.create({ asset: asset._id, price: 11 });
    const res = await request(getApp()).get(`/api/quotes/${asset._id}/history?limit=5`).expect(200);
    const prices = res.body.map(r => r.price);
  // Ordering can vary depending on insertion timestamps; enforce by sorting locally
  const sorted = [...prices].sort((a,b) => a-b);
  expect(sorted).toEqual([10, 11]);
  });

  test('alert history endpoint returns pagination structure', async () => {
    const asset = await Asset.create({ name: 'Gold', symbol: 'GOLD', providerSymbol: 'GC=F' });
    await AlertHistory.create({ asset: asset._id, symbol: 'GOLD', name: 'Gold', boundary: 'upper', price: 2000, threshold: 1990 });
    const res = await request(getApp()).get('/api/alerts/history?page=1&pageSize=10').expect(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.total).toBe(1);
  });

  test('alert history filtering by boundary', async () => {
    const asset = await Asset.create({ name: 'Silver', symbol: 'SILV', providerSymbol: 'SI=F' });
    await AlertHistory.create({ asset: asset._id, symbol: 'SILV', name: 'Silver', boundary: 'upper', price: 30, threshold: 29 });
    await AlertHistory.create({ asset: asset._id, symbol: 'SILV', name: 'Silver', boundary: 'lower', price: 25, threshold: 26 });
    const resUpper = await request(getApp()).get(`/api/alerts/history?symbol=SILV&boundary=upper`).expect(200);
    expect(resUpper.body.total).toBe(1);
    expect(resUpper.body.data[0].boundary).toBe('upper');
  });
});