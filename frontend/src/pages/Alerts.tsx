import React, { useEffect, useState } from 'react';
import { getAlertHistory, type AlertHistoryQuery } from '../services/api';

interface AlertRow {
  _id: string;
  symbol: string;
  name: string;
  boundary: string;
  price: number;
  threshold?: number;
  triggeredAt: string;
}

export const AlertsPage: React.FC = () => {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [symbol, setSymbol] = useState('');
  const [boundary, setBoundary] = useState('');
  const pageSize = 20;

  const load = async (override: Partial<AlertHistoryQuery> = {}) => {
    setLoading(true);
    try {
  const b = boundary === 'upper' || boundary === 'lower' ? boundary : undefined;
  const res = await getAlertHistory({ page, pageSize, symbol: symbol || undefined, boundary: b, ...override });
      setRows(res.data as any);
      setTotalPages(res.totalPages);
      if (override.page) setPage(override.page);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page]);

  const applyFilters = () => { setPage(1); load({ page: 1 }); };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Alert History</h2>
      <div className="flex flex-wrap gap-4 items-end text-sm">
        <div className="flex flex-col">
          <label className="text-xs uppercase tracking-wide">Symbol</label>
          <input value={symbol} onChange={e => setSymbol(e.target.value)} className="bg-gray-800 px-2 py-1 rounded w-32" placeholder="e.g. NIFTY" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs uppercase tracking-wide">Boundary</label>
          <select value={boundary} onChange={e => setBoundary(e.target.value)} className="bg-gray-800 px-2 py-1 rounded w-32">
            <option value="">Any</option>
            <option value="upper">Upper</option>
            <option value="lower">Lower</option>
          </select>
        </div>
        <button onClick={applyFilters} className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded">Apply</button>
      </div>
      {loading && <div className="text-sm opacity-60">Loading...</div>}
      {!loading && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left opacity-70">
                <th className="p-2">Time</th>
                <th>Symbol</th>
                <th>Name</th>
                <th>Boundary</th>
                <th>Price</th>
                <th>Threshold</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r._id} className="odd:bg-gray-900 even:bg-gray-800">
                  <td className="p-2 whitespace-nowrap">{new Date(r.triggeredAt || (r as any).time).toLocaleString()}</td>
                  <td>{r.symbol}</td>
                  <td>{r.name}</td>
                  <td className={r.boundary === 'upper' ? 'text-emerald-400' : 'text-rose-400'}>{r.boundary}</td>
                  <td>{r.price}</td>
                  <td>{r.threshold ?? '-'}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center opacity-60">No alerts</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex gap-2 items-center text-xs">
        <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-2 py-1 bg-gray-800 rounded disabled:opacity-40">Prev</button>
        <span>Page {page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-2 py-1 bg-gray-800 rounded disabled:opacity-40">Next</button>
      </div>
    </div>
  );
};

export default AlertsPage;