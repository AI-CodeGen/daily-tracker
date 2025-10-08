import request from 'supertest';
import Asset from '../src/models/Asset.js';

// Access the Express app created in global test setup (mongodb-memory-server)
const getApp = () => global.__APP__();

describe('Assets API', () => {
  test('create & list assets with pagination/sorting', async () => {
    const payloads = [
      { name: 'Alpha', symbol: 'ALP', providerSymbol: 'ALP.X' },
      { name: 'Beta', symbol: 'BET', providerSymbol: 'BET.X' },
      { name: 'Gamma', symbol: 'GAM', providerSymbol: 'GAM.X' },
    ];
    for (const p of payloads) {
      // eslint-disable-next-line no-await-in-loop
      await request(getApp()).post('/api/assets').send(p).expect(201);
    }
    const res = await request(getApp()).get('/api/assets?page=1&pageSize=2&sortBy=name&sortDir=asc').expect(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.total).toBe(3);
    expect(res.body.data[0].name).toBe('Alpha');
  });

  test('duplicate symbol check', async () => {
    await request(getApp()).post('/api/assets').send({ name: 'Delta', symbol: 'DEL', providerSymbol: 'DEL.X' }).expect(201);
    const res = await request(getApp()).get('/api/assets?symbolExact=DEL').expect(200);
    expect(res.body.exists).toBe(true);
  });

  test('duplicate symbol negative (not found)', async () => {
    const res = await request(getApp()).get('/api/assets?symbolExact=NOTFOUND').expect(200);
    expect(res.body.exists).toBe(false);
    expect(res.body.asset).toBeNull();
  });

  test('batch import', async () => {
    const csv = 'name,symbol,providerSymbol\nTest1,T1,T1.X\nTest2,T2,T2.X';
    const res = await request(getApp()).post('/api/assets/batch')
      .set('Content-Type', 'text/plain')
      .send(csv)
      .expect(201);
    expect(res.body.imported).toBe(2);
    const list = await request(getApp()).get('/api/assets').expect(200);
    // list could be paginated object or array depending on logic
    const count = Array.isArray(list.body) ? list.body.length : list.body.total;
    expect(count).toBe(2 + res.body.imported - 2); // ensure at least imported present
  });
});