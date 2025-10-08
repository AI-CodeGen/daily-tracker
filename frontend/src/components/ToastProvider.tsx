import React, { createContext, useCallback, useContext, useState } from 'react';

interface Toast { id: number; message: string; type?: 'success' | 'error' | 'info'; }

interface ToastContextValue {
  push(message: string, type?: Toast['type']): void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50 w-72">
        {toasts.map(t => (
          <div key={t.id} className={
            `text-sm px-3 py-2 rounded shadow border ` +
            (t.type === 'error' ? 'bg-rose-600/90 border-rose-400' : t.type === 'success' ? 'bg-emerald-600/90 border-emerald-400' : 'bg-gray-700/90 border-gray-500')
          }>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};