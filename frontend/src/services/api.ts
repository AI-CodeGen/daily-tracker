import axios from 'axios';
import type { Asset, QuoteSnapshot } from '../types';

const client = axios.create({ baseURL: '/api' });

export interface AssetListParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  q?: string;
  symbolExact?: string; // used internally for dup check
}

export async function getAssets(params: AssetListParams = {}): Promise<any> {
  const { data } = await client.get('/assets', { params });
  return data; // can be array or paginated object depending on backend shape
}

export async function checkDuplicateSymbol(symbol: string) {
  const { data } = await client.get('/assets', { params: { symbolExact: symbol } });
  return data as { exists: boolean; asset: Asset | null };
}

export async function batchImport(csv: string) {
  const { data } = await client.post('/assets/batch', csv, { headers: { 'Content-Type': 'text/plain' } });
  return data as { imported: number; items: Asset[] };
}

export async function createAsset(payload: Partial<Asset>): Promise<Asset> {
  const { data } = await client.post('/assets', payload);
  return data;
}

export async function updateAsset(id: string, payload: Partial<Asset>): Promise<Asset> {
  const { data } = await client.put(`/assets/${id}`, payload);
  return data;
}

export async function deleteAsset(id: string): Promise<void> {
  await client.delete(`/assets/${id}`);
}

export async function getCurrentQuotes(): Promise<QuoteSnapshot[]> {
  const { data } = await client.get('/quotes/current');
  return data;
}

export async function getHistory(assetId: string, limit = 50) {
  const { data } = await client.get(`/quotes/${assetId}/history`, { params: { limit } });
  return data as any[];
}

export interface AlertHistoryQuery {
  assetId?: string;
  symbol?: string;
  boundary?: 'upper' | 'lower';
  page?: number;
  pageSize?: number;
}

export async function getAlertHistory(params: AlertHistoryQuery = {}) {
  const { data } = await client.get('/alerts/history', { params });
  return data as { data: any[]; page: number; pageSize: number; total: number; totalPages: number };
}

export async function triggerFetchNow(): Promise<{ success: boolean }> {
  const { data } = await client.post('/admin/fetch-now');
  return data;
}
