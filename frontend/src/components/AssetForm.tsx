import React, { useState } from 'react';
import { checkDuplicateSymbol } from '../services/api';
import type { Asset } from '../types';

interface Props {
  // Should resolve with the created Asset so caller can optimistically update UI
  onCreate(asset: Partial<Asset>): Promise<Asset>;
}

export const AssetForm: React.FC<Props> = ({ onCreate }) => {
  const [form, setForm] = useState<{ name: string; symbol: string; providerSymbol: string; upperThreshold?: string; lowerThreshold?: string }>({ name: '', symbol: '', providerSymbol: '' });
  const [loading, setLoading] = useState(false);
  const [symbolError, setSymbolError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Partial<Asset> = {
        name: form.name,
        symbol: form.symbol,
        providerSymbol: form.providerSymbol,
      };
      if (form.upperThreshold) payload.upperThreshold = Number(form.upperThreshold);
      if (form.lowerThreshold) payload.lowerThreshold = Number(form.lowerThreshold);
      await onCreate(payload);
      setForm({ name: '', symbol: '', providerSymbol: '' });
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="flex gap-2 flex-wrap items-end">
      <div className="flex flex-col">
        <label className="text-xs">Name</label>
        <input className="bg-gray-800 px-2 py-1 rounded" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
      </div>
      <div className="flex flex-col min-w-40">
        <label className="text-xs">Symbol</label>
        <input
          className={`bg-gray-800 px-2 py-1 rounded ${symbolError ? 'ring-1 ring-rose-500' : ''}`}
          value={form.symbol}
          onChange={e => { setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() })); setSymbolError(null); }}
          onBlur={async () => {
            if (!form.symbol) return;
            try {
              const dup = await checkDuplicateSymbol(form.symbol);
              if (dup.exists) setSymbolError('Symbol already exists');
              else setSymbolError(null);
            } catch { /* ignore */ }
          }}
          required
        />
        {symbolError && <span className="text-rose-400 text-[10px] mt-0.5">{symbolError}</span>}
      </div>
      <div className="flex flex-col">
        <label className="text-xs">Provider Symbol</label>
        <input className="bg-gray-800 px-2 py-1 rounded" value={form.providerSymbol} onChange={e => setForm(f => ({ ...f, providerSymbol: e.target.value }))} required />
      </div>
      <div className="flex flex-col">
        <label className="text-xs">Upper</label>
        <input type="number" step="any" className="bg-gray-800 px-2 py-1 rounded w-28" value={form.upperThreshold || ''} onChange={e => setForm(f => ({ ...f, upperThreshold: e.target.value }))} />
      </div>
      <div className="flex flex-col">
        <label className="text-xs">Lower</label>
        <input type="number" step="any" className="bg-gray-800 px-2 py-1 rounded w-28" value={form.lowerThreshold || ''} onChange={e => setForm(f => ({ ...f, lowerThreshold: e.target.value }))} />
      </div>
  <button disabled={loading || !!symbolError} className="bg-indigo-600 hover:bg-indigo-500 px-3 py-2 rounded text-sm disabled:opacity-50">Add</button>
    </form>
  );
};
