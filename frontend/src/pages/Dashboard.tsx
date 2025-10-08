import React, { useEffect, useState } from 'react';
import { getCurrentQuotes, triggerFetchNow } from '../services/api';
import type { QuoteSnapshot } from '../types';
import { AssetCard } from '../components/AssetCard';

interface AlertEvent {
  assetId: string; symbol: string; name: string; boundary: 'upper'|'lower'; price: number; threshold: number; time: string;
}

export const Dashboard: React.FC = () => {
  const [quotes, setQuotes] = useState<QuoteSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const q = await getCurrentQuotes();
      setQuotes(q);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30 * 60 * 1000); // 30 mins

    let retry = 0;
    let es: EventSource | null = null;
    const connect = () => {
      es = new EventSource('/api/stream/alerts');
      es.addEventListener('thresholdAlert', (evt: MessageEvent) => {
        retry = 0; // reset on successful message
        try {
          const data: AlertEvent = JSON.parse(evt.data);
          setAlerts(a => [data, ...a].slice(0, 5));
        } catch { /* ignore */ }
      });
      es.onerror = () => {
        es?.close();
        const delay = Math.min(30000, 1000 * 2 ** retry + Math.random() * 300);
        retry += 1;
        setTimeout(connect, delay);
      };
    };
    connect();
    return () => { clearInterval(id); es?.close(); };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold">Live Dashboard</h2>
        <button
          disabled={refreshing}
          onClick={async () => {
            try {
              setRefreshing(true);
              await triggerFetchNow();
              await load();
            } catch {
              // could add toast if available
            } finally { setRefreshing(false); }
          }}
          className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-1 rounded"
        >{refreshing ? 'Refreshing...' : 'Refresh Now'}</button>
      </div>
      {alerts.length > 0 && (
        <div className="space-y-1">
          {alerts.map(a => (
            <div key={a.time + a.assetId} className="text-xs bg-gray-800 border-l-4 border-indigo-500 px-2 py-1 rounded">
              <span className="font-semibold">{a.symbol}</span> breached {a.boundary} ({a.threshold}) at {a.price} · {new Date(a.time).toLocaleTimeString()}
            </div>
          ))}
        </div>
      )}
      {loading && <div className="text-sm opacity-60">Loading...</div>}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {quotes.map(q => <AssetCard key={q.assetId} quote={q} />)}
      </div>
    </div>
  );
};
