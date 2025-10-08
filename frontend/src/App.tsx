import React, { useState, Suspense } from 'react';
import { Dashboard } from './pages/Dashboard';
const ConfigPage = React.lazy(() => import('./pages/Config'));
const AlertsPage = React.lazy(() => import('./pages/Alerts'));

const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'config', label: 'Configuration' },
  { id: 'alerts', label: 'Alerts' },
];

const App: React.FC = () => {
  const [tab, setTab] = useState('dashboard');
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-wide">Daily Tracker</h1>
        <nav className="flex gap-3">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-1 rounded text-sm ${tab === t.id ? 'bg-indigo-600' : 'bg-gray-800 hover:bg-gray-700'}`}>{t.label}</button>
          ))}
        </nav>
      </header>
      <main>
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'config' && (
          <Suspense fallback={<div className="text-sm opacity-60">Loading config...</div>}>
            <ConfigPage />
          </Suspense>
        )}
        {tab === 'alerts' && (
          <Suspense fallback={<div className="text-sm opacity-60">Loading alerts...</div>}>
            <AlertsPage />
          </Suspense>
        )}
      </main>
    </div>
  );
};

export default App;
