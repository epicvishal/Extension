import { useEffect, useState } from 'react';
import { Cookie, Database, Globe, Send, ShieldOff, Timer } from 'lucide-react';
import { CookiesPanel } from '@/components/CookiesPanel';
import { HeadersPanel } from '@/components/HeadersPanel';
import { StoragePanel } from '@/components/StoragePanel';
import { ToastProvider } from '@/components/Toast';
import { EmptyState } from '@/components/ui';
import { getActiveTab, type ActiveTab } from '@/utils/tab';

const TABS = [
  { id: 'cookies', label: 'Cookies', icon: Cookie },
  { id: 'local', label: 'Local storage', icon: Database },
  { id: 'session', label: 'Session storage', icon: Timer },
  { id: 'headers', label: 'Headers', icon: Send },
] as const;

type TabId = (typeof TABS)[number]['id'];

function App() {
  const [page, setPage] = useState<ActiveTab | null | undefined>(undefined);
  const [active, setActive] = useState<TabId>('cookies');
  const [iconFailed, setIconFailed] = useState(false);

  useEffect(() => {
    getActiveTab().then(setPage, () => setPage(null));
  }, []);

  return (
    <div className="relative flex h-[580px] w-[600px] flex-col overflow-hidden bg-bg font-sans text-fg">
      <ToastProvider>
        <header className="border-b border-border bg-surface px-3 pt-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
              <Cookie className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[13px] leading-4 font-semibold">Site Data Editor</h1>
              <p className="text-[11px] text-muted">Cookies, storage and request headers</p>
            </div>
            {page && (
              <div
                className="flex max-w-[45%] items-center gap-1.5 rounded-full border border-border bg-bg py-1 pr-2.5 pl-1.5"
                title={page.url.href}
              >
                {page.favIconUrl && !iconFailed ? (
                  <img src={page.favIconUrl} alt="" className="size-3.5 rounded-sm" onError={() => setIconFailed(true)} />
                ) : (
                  <Globe className="size-3.5 text-faint" />
                )}
                <span className="truncate text-[11px] font-medium text-muted">{page.url.hostname}</span>
              </div>
            )}
          </div>
          <nav className="mt-2.5 -mb-px flex gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={`flex items-center gap-1.5 border-b-2 px-2 pb-2 text-xs font-medium transition-colors ${
                  active === id
                    ? 'border-accent text-accent'
                    : 'border-transparent text-muted hover:text-fg'
                }`}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </nav>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          {page === undefined ? null : page === null ? (
            <EmptyState
              icon={<ShieldOff />}
              title="This page can't be edited"
              text="Browser pages like settings and the new tab page are protected. Open a website (http or https) and try again."
            />
          ) : (
            <>
              {active === 'cookies' && <CookiesPanel pageUrl={page.url} />}
              {active === 'local' && <StoragePanel key="local" tabId={page.id} area="localStorage" />}
              {active === 'session' && <StoragePanel key="session" tabId={page.id} area="sessionStorage" />}
              {active === 'headers' && <HeadersPanel hostname={page.url.hostname} />}
            </>
          )}
        </main>
      </ToastProvider>
    </div>
  );
}

export default App;
