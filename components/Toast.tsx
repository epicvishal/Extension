import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';

type Tone = 'success' | 'error';
type ShowToast = (message: string, tone?: Tone) => void;

const ToastContext = createContext<ShowToast>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string; tone: Tone } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.tone === 'error' ? 4500 : 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const show = useCallback<ShowToast>((message, tone = 'success') => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div key={toast.id} className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center px-4">
          <div
            role="status"
            className={`flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white shadow-lg [&_svg]:size-3.5 [&_svg]:shrink-0 ${
              toast.tone === 'error' ? 'bg-red-600' : 'bg-slate-900 dark:bg-slate-700'
            }`}
          >
            {toast.tone === 'error' ? <CircleAlert /> : <CircleCheck />}
            <span className="truncate">{toast.message}</span>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
