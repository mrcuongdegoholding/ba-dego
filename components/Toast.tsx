'use client';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; type: ToastType; message: string }

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {}, success: () => {}, error: () => {},
});

let _id = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++_id;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  const success = useCallback((m: string) => toast(m, 'success'), [toast]);
  const error = useCallback((m: string) => toast(m, 'error'), [toast]);

  const meta: Record<ToastType, { icon: string; cls: string }> = {
    success: { icon: '✓', cls: 'bg-green-600 text-white' },
    error:   { icon: '✕', cls: 'bg-red-600 text-white' },
    info:    { icon: 'ℹ', cls: 'bg-slate-800 text-white' },
  };

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 no-print">
        {toasts.map(t => (
          <div key={t.id}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium min-w-[260px] max-w-sm animate-fade-in ${meta[t.type].cls}`}>
            <span className="font-bold text-base">{meta[t.type].icon}</span>
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="text-white/70 hover:text-white text-lg leading-none">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
