import React, { useEffect, useState } from 'react';
import { createAsset, deleteAsset, getAssets, updateAsset, checkDuplicateSymbol, batchImport } from '../services/api';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';
import type { Asset } from '../types';
import { AssetForm } from '../components/AssetForm';

export const ConfigPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<'name' | 'symbol' | 'createdAt'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [query, setQuery] = useState('');
  const toast = useToast();
  const [csvText, setCsvText] = useState('');
  const [dupWarning, setDupWarning] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; symbol: string; providerSymbol: string; upperThreshold?: string; lowerThreshold?: string }>({ name: '', symbol: '', providerSymbol: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editSymbolDup, setEditSymbolDup] = useState(false);
  const [editProviderDup, setEditProviderDup] = useState(false);
  const [editingOriginal, setEditingOriginal] = useState<Asset | null>(null);

  async function load(resetPage = false) {
    setLoading(true);
    try {
      const currentPage = resetPage ? 1 : page;
      const res = await getAssets({ page: currentPage, pageSize, sortBy, sortDir, q: query || undefined });
      if (Array.isArray(res)) {
        setAssets(res);
        setTotalPages(1);
        setTotal(res.length);
      } else {
        setAssets(res.data);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      }
      if (resetPage) setPage(1);
    } catch (e: any) {
      toast.push('Failed to load assets', 'error');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page, sortBy, sortDir, pageSize]);

  // Debounced search
  useEffect(() => {
    const id = setTimeout(() => { load(true); }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Inline duplicate symbol check (on symbol field change) handled in AssetForm? We'll add here by intercepting create.

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Configuration</h2>
        {!isAuthenticated && (
          <div className="text-sm text-amber-400 bg-amber-400/10 px-3 py-2 rounded border border-amber-400/20">
            Login with Google to create and manage your own assets
          </div>
        )}
      </div>
      {isAuthenticated && (
        <>
          <AssetForm onCreate={async a => {
            const symbol = a.symbol || '';
            const dup = await checkDuplicateSymbol(symbol);
            if (dup.exists) {
              setDupWarning(`Symbol ${symbol} already exists`);
              toast.push(`Duplicate symbol: ${symbol}`, 'error');
              throw new Error('Duplicate');
            }
            setDupWarning(null);
            const created = await createAsset(a);
            toast.push(`Added ${created.symbol}`, 'success');
            load(true);
            return created;
          }} />
          {dupWarning && <div className="text-xs text-rose-400">{dupWarning}</div>}
        </>
      )}
      <div className="flex flex-wrap gap-4 items-end text-xs">
        <div className="flex flex-col">
          <label className="uppercase tracking-wide">Sort By</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="bg-gray-800 px-2 py-1 rounded">
            <option value="createdAt">Created</option>
            <option value="name">Name</option>
            <option value="symbol">Symbol</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="uppercase tracking-wide">Direction</label>
          <select value={sortDir} onChange={e => setSortDir(e.target.value as any)} className="bg-gray-800 px-2 py-1 rounded">
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="uppercase tracking-wide">Search</label>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="name/symbol" className="bg-gray-800 px-2 py-1 rounded w-40" />
        </div>
        {isAuthenticated && (
          <>
            <div className="flex flex-col w-64">
              <label className="uppercase tracking-wide">Batch CSV</label>
              <textarea value={csvText} onChange={e => setCsvText(e.target.value)} rows={3} placeholder="name,symbol,providerSymbol,upperThreshold,lowerThreshold" className="bg-gray-800 px-2 py-1 rounded resize-y" />
            </div>
            <button onClick={async () => {
              if (!csvText.trim()) return;
              try {
                const { imported } = await batchImport(csvText.trim());
                toast.push(`Imported ${imported} assets`, 'success');
                setCsvText('');
                load(true);
              } catch (e: any) {
                toast.push('Import failed', 'error');
              }
            }} className="bg-indigo-600 px-3 py-2 rounded">Upload</button>
          </>
        )}
        {isAuthenticated && (
          <button onClick={async () => {
            try {
              // Fetch all assets ignoring pagination (iterate pages)
              let all: Asset[] = [];
              let currentPage = 1;
              let pages = 1;
              do {
                // request large page size to minimize loops
                const res = await getAssets({ page: currentPage, pageSize: 200, sortBy, sortDir, q: query || undefined });
                if (Array.isArray(res)) {
                  all = res; // non-paginated mode
                  pages = 1;
                  break;
                } else {
                  all = all.concat(res.data);
                  pages = res.totalPages;
                }
                currentPage++;
              } while (currentPage <= pages);

              const headers = ['name', 'symbol', 'providerSymbol', 'upperThreshold', 'lowerThreshold', 'unit', 'currency'];
              const lines = [headers.join(',')];
              for (const a of all) {
                const row = [
                  a.name ?? '',
                  a.symbol ?? '',
                  a.providerSymbol ?? '',
                  a.upperThreshold != null ? String(a.upperThreshold) : '',
                  a.lowerThreshold != null ? String(a.lowerThreshold) : '',
                  a.unit ?? '',
                  a.currency ?? ''
                ];
                // basic CSV escape (wrap if contains comma or quote)
                const safe = row.map(v => /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
                lines.push(safe.join(','));
              }
              const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const aEl = document.createElement('a');
              aEl.href = url;
              const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
              aEl.download = `assets-export-${ts}.csv`;
              document.body.appendChild(aEl);
              aEl.click();
              document.body.removeChild(aEl);
              URL.revokeObjectURL(url);
              toast.push(`Exported ${all.length} assets`, 'success');
            } catch (err: any) {
              toast.push('Export failed', 'error');
            }
          }} className="bg-gray-700 px-3 py-2 rounded">Export Configurations</button>
        )}
      </div>
      {isAuthenticated && <div className="text-[10px] opacity-60 -mt-2">Export format matches import headers: name,symbol,providerSymbol,upperThreshold,lowerThreshold,unit,currency</div>}
      {loading && <div className="text-sm opacity-60">Loading...</div>}
      <div className="space-y-2">
        {assets.map(a => (
          <div key={a._id} className="bg-gray-900 rounded p-3 flex flex-col gap-3">
            {editingId === a._id ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-3 text-xs items-end">
                  <div className="flex flex-col">
                    <label className="uppercase tracking-wide">Name</label>
                    <input className="bg-gray-800 px-2 py-1 rounded" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="flex flex-col">
                    <label className="uppercase tracking-wide">Symbol</label>
                    <input
                      className="bg-gray-800 px-2 py-1 rounded"
                      value={editForm.symbol}
                      onChange={e => { setEditForm(f => ({ ...f, symbol: e.target.value.toUpperCase() })); setEditSymbolDup(false); }}
                      onBlur={async () => {
                        if (!editForm.symbol) return;
                        if (editForm.symbol === a.symbol) return; // unchanged
                        try {
                          const dup = await checkDuplicateSymbol(editForm.symbol);
                          if (dup.exists && dup.asset && dup.asset._id !== a._id) {
                            setEditSymbolDup(true);
                            toast.push(`Duplicate symbol: ${editForm.symbol}`, 'error');
                          }
                        } catch {/* ignore */ }
                      }}
                    />
                    {editSymbolDup && <span className="text-[10px] text-rose-400 mt-0.5">Symbol already exists</span>}
                  </div>
                  <div className="flex flex-col">
                    <label className="uppercase tracking-wide">Provider Symbol</label>
                    <input
                      className="bg-gray-800 px-2 py-1 rounded"
                      value={editForm.providerSymbol}
                      onChange={e => { setEditForm(f => ({ ...f, providerSymbol: e.target.value })); setEditProviderDup(false); }}
                      onBlur={() => {
                        if (!editForm.providerSymbol) return;
                        if (editForm.providerSymbol === a.providerSymbol) return;
                        const dup = assets.some(x => x._id !== a._id && x.providerSymbol === editForm.providerSymbol);
                        if (dup) {
                          setEditProviderDup(true);
                          toast.push(`Duplicate provider symbol: ${editForm.providerSymbol}`, 'error');
                        }
                      }}
                    />
                    {editProviderDup && <span className="text-[10px] text-rose-400 mt-0.5">Provider symbol already used</span>}
                  </div>
                  <div className="flex flex-col">
                    <label className="uppercase tracking-wide">Upper</label>
                    <input type="number" step="any" className="bg-gray-800 px-2 py-1 rounded w-28" value={editForm.upperThreshold || ''} onChange={e => setEditForm(f => ({ ...f, upperThreshold: e.target.value }))} />
                  </div>
                  <div className="flex flex-col">
                    <label className="uppercase tracking-wide">Lower</label>
                    <input type="number" step="any" className="bg-gray-800 px-2 py-1 rounded w-28" value={editForm.lowerThreshold || ''} onChange={e => setEditForm(f => ({ ...f, lowerThreshold: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  <button
                    disabled={editLoading || !editForm.name || !editForm.symbol || !editForm.providerSymbol || editSymbolDup || editProviderDup}
                    onClick={async () => {
                      setEditLoading(true);
                      try {
                        // Duplicate check if symbol changed
                        if (editForm.symbol !== a.symbol) {
                          const dup = await checkDuplicateSymbol(editForm.symbol);
                          if (dup.exists && dup.asset && dup.asset._id !== a._id) {
                            toast.push(`Symbol ${editForm.symbol} already exists`, 'error');
                            setEditLoading(false); return;
                          }
                        }
                        // provider symbol dup final check
                        if (editForm.providerSymbol !== a.providerSymbol) {
                          const providerDup = assets.some(x => x._id !== a._id && x.providerSymbol === editForm.providerSymbol);
                          if (providerDup) { toast.push(`Provider symbol ${editForm.providerSymbol} already used`, 'error'); setEditLoading(false); return; }
                        }
                        const payload: any = {
                          name: editForm.name,
                          symbol: editForm.symbol,
                          providerSymbol: editForm.providerSymbol,
                        };
                        if (editForm.upperThreshold) payload.upperThreshold = Number(editForm.upperThreshold);
                        else payload.upperThreshold = undefined;
                        if (editForm.lowerThreshold) payload.lowerThreshold = Number(editForm.lowerThreshold);
                        else payload.lowerThreshold = undefined;
                        const updated = await updateAsset(a._id, payload);
                        setAssets(prev => prev.map(p => p._id === a._id ? updated : p));
                        toast.push(`Updated ${updated.symbol}`, 'success');
                        setEditingId(null);
                      } catch (err: any) {
                        toast.push('Update failed', 'error');
                      } finally { setEditLoading(false); }
                    }}
                    className="bg-indigo-600 px-3 py-1 rounded disabled:opacity-50"
                  >Save</button>
                  <button
                    onClick={() => {
                      // confirm if dirty
                      if (editingOriginal) {
                        const dirty = (
                          editingOriginal.name !== editForm.name ||
                          editingOriginal.symbol !== editForm.symbol ||
                          editingOriginal.providerSymbol !== editForm.providerSymbol ||
                          (editingOriginal.upperThreshold != null ? String(editingOriginal.upperThreshold) : undefined) !== editForm.upperThreshold ||
                          (editingOriginal.lowerThreshold != null ? String(editingOriginal.lowerThreshold) : undefined) !== editForm.lowerThreshold
                        );
                        if (dirty && !window.confirm('Discard your changes?')) return;
                      }
                      setEditingId(null);
                      setEditSymbolDup(false);
                      setEditProviderDup(false);
                      setEditingOriginal(null);
                    }}
                    className="bg-gray-700 px-3 py-1 rounded"
                  >Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold tracking-wide">{a.name} <span className="text-xs opacity-60">({a.symbol})</span></div>
                    {a.isGlobal ? (
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-600/20 text-emerald-400 rounded-full border border-emerald-600/30">
                        GLOBAL
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 bg-indigo-600/20 text-indigo-400 rounded-full border border-indigo-600/30">
                        USER
                      </span>
                    )}
                  </div>
                  <div className="text-xs opacity-60">Provider: {a.providerSymbol}</div>
                  <div className="text-[10px] opacity-60 flex gap-2">Upper: {a.upperThreshold ?? '—'} | Lower: {a.lowerThreshold ?? '—'}</div>
                  {a.userId && (
                    <div className="text-[10px] opacity-50">Created by: {a.userId.name}</div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {isAuthenticated && !a.isGlobal && (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(a._id);
                          setEditingOriginal(a);
                          setEditForm({
                            name: a.name || '',
                            symbol: a.symbol || '',
                            providerSymbol: a.providerSymbol || '',
                            upperThreshold: a.upperThreshold != null ? String(a.upperThreshold) : undefined,
                            lowerThreshold: a.lowerThreshold != null ? String(a.lowerThreshold) : undefined,
                          });
                          setEditSymbolDup(false);
                          setEditProviderDup(false);
                        }}
                        className="text-indigo-400 hover:underline"
                      >Edit</button>
                      <button
                        onClick={async () => {
                          await deleteAsset(a._id);
                          setAssets(prev => prev.filter(p => p._id !== a._id));
                          toast.push(`Deleted ${a.symbol}`, 'info');
                        }}
                        className="text-rose-400 hover:underline"
                      >Delete</button>
                    </>
                  )}
                  {a.isGlobal && (
                    <span className="text-xs text-gray-500">Read-only</span>
                  )}
                  {!isAuthenticated && (
                    <span className="text-xs text-gray-500">Login to manage assets</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {!loading && assets.length === 0 && (
          <div className="text-sm opacity-60">No assets configured yet.</div>
        )}
      </div>
      <div className="flex items-center flex-wrap gap-3 text-xs pt-2">
        <span className="bg-gray-800 px-2 py-1 rounded">Total: {total}</span>
        <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-2 py-1 bg-gray-800 rounded disabled:opacity-40">Prev</button>
        <span>Page {page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-2 py-1 bg-gray-800 rounded disabled:opacity-40">Next</button>
        <label className="flex items-center gap-1">Page Size
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="bg-gray-800 px-2 py-1 rounded">
            {[5, 10, 20, 50].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
};

export default ConfigPage;
