import React, { useState, Suspense, useEffect } from 'react';
import ReactGA from 'react-ga4';
import { AuthProvider } from './context/AuthContext';
import { UserProfile } from './components/UserProfile';
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

  useEffect(() => {
    const currentTab = tabs.find(t => t.id === tab);
    if (ReactGA.isInitialized && currentTab) {
      ReactGA.send({
        hitType: "pageview",
        page: `/${tab}`,
        title: currentTab.label,
      });
    }
  }, [tab]);

  return (
    <AuthProvider>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-wide">Daily Tracker</h1>
          <div className="flex items-center gap-4">
            <nav className="flex gap-3">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-1 rounded text-sm ${tab === t.id ? 'bg-indigo-600' : 'bg-gray-800 hover:bg-gray-700'}`}>{t.label}</button>
              ))}
            </nav>
            <UserProfile />
          </div>
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
    </AuthProvider>
  );
};

export default App;
