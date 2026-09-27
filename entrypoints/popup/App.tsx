import { useEffect, useState } from 'react';
import { CookiesPanel } from '@/components/CookiesPanel';
import { HeadersPanel } from '@/components/HeadersPanel';
import { StoragePanel } from '@/components/StoragePanel';
import { getActiveTab, type ActiveTab } from '@/utils/tab';

const TABS = [
  { id: 'cookies', label: 'Cookies' },
  { id: 'local', label: 'Local storage' },
  { id: 'session', label: 'Session storage' },
  { id: 'headers', label: 'Headers' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function App() {
  const [page, setPage] = useState<ActiveTab | null | undefined>(undefined);
  const [active, setActive] = useState<TabId>('cookies');

  useEffect(() => {
    getActiveTab().then(setPage, () => setPage(null));
  }, []);

  return (
    <div className="flex max-h-[580px] w-[560px] flex-col font-sans text-slate-800">
      <header className="border-b border-slate-200 px-3 pt-2">
        <div className="flex items-baseline justify-between">
          <h1 className="text-sm font-semibold">Site Data Editor</h1>
          {page && <span className="truncate text-xs text-slate-500">{page.url.hostname}</span>}
        </div>
        <nav className="mt-1.5 flex gap-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`border-b-2 pb-1.5 text-xs font-medium ${
                active === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="flex-1 overflow-y-auto p-3">
        {page === undefined ? null : page === null ? (
          <p className="py-6 text-center text-xs text-slate-500">
            Open a website (http or https) to edit its data.
          </p>
        ) : (
          <>
            {active === 'cookies' && <CookiesPanel pageUrl={page.url} />}
            {active === 'local' && <StoragePanel key="local" tabId={page.id} area="localStorage" />}
            {active === 'session' && <StoragePanel key="session" tabId={page.id} area="sessionStorage" />}
            {active === 'headers' && <HeadersPanel hostname={page.url.hostname} />}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
