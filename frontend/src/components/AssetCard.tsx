import React, { useEffect, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { getHistory, updateAsset } from '../services/api';
import type { QuoteSnapshot } from '../types';

interface Props { quote: QuoteSnapshot; }

export const AssetCard: React.FC<Props> = ({ quote }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [upper, setUpper] = useState<string>('');
  const [lower, setLower] = useState<string>('');
  useEffect(() => {
    let mounted = true;
    getHistory(quote.assetId, 10).then(d => { if (mounted) setHistory(d); });
    return () => { mounted = false; };
  }, [quote.assetId]);

  const color = (quote.changePercent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400';

  const saveThresholds = async () => {
    await updateAsset(quote.assetId, {
      upperThreshold: upper ? Number(upper) : undefined,
      lowerThreshold: lower ? Number(lower) : undefined,
    });
    setEditing(false);
  };

  return (
    <div className="p-4 bg-gray-900 rounded shadow flex flex-col gap-2 relative">
      <div className="flex justify-between items-baseline">
        <h3 className="font-semibold">{quote.name}</h3>
        <span className={`text-sm ${color}`}>{quote.changePercent?.toFixed(2)}%</span>
      </div>
      <div className="text-2xl font-bold flex items-baseline gap-2 flex-wrap">
        <span>{quote.price}</span>
        {quote.currency && <span className="text-sm font-medium text-gray-300">{quote.currency}</span>}
        {quote.unit && <span className="text-base font-normal text-gray-400">per {quote.unit}</span>}
      </div>
      <div className="h-14">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history}>
            <Area type="monotone" dataKey="price" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {!editing && (
        <button onClick={() => { setUpper(''); setLower(''); setEditing(true); }} className="self-end text-xs text-indigo-400 hover:underline">Edit thresholds</button>
      )}
      {editing && (
        <div className="flex flex-col gap-2 text-xs bg-gray-800/70 p-2 rounded">
          <div className="flex gap-2">
            <input placeholder="Upper" type="number" step="any" value={upper} onChange={e => setUpper(e.target.value)} className="bg-gray-700 px-1 rounded w-24" />
            <input placeholder="Lower" type="number" step="any" value={lower} onChange={e => setLower(e.target.value)} className="bg-gray-700 px-1 rounded w-24" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(false)} className="px-2 py-1 bg-gray-700 rounded">Cancel</button>
            <button onClick={saveThresholds} className="px-2 py-1 bg-indigo-600 rounded">Save</button>
          </div>
        </div>
      )}
      <div className="text-xs opacity-60">Updated {new Date(quote.takenAt).toLocaleTimeString()}</div>
    </div>
  );
};
