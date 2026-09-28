import { useEffect, useState } from 'react';
import { Cookie, Database, Globe, PanelRightOpen, Send, ShieldOff, Timer } from 'lucide-react';
import { CookiesPanel } from '@/components/CookiesPanel';
import { HeadersPanel } from '@/components/HeadersPanel';
import { StoragePanel } from '@/components/StoragePanel';
import { ToastProvider } from '@/components/Toast';
import { EmptyState, IconButton } from '@/components/ui';
import { useActiveTab } from '@/utils/useActiveTab';

const TABS = [
  { id: 'cookies', label: 'Cookies', title: 'Cookies', icon: Cookie },
  { id: 'local', label: 'Local', title: 'Local storage', icon: Database },
  { id: 'session', label: 'Session', title: 'Session storage', icon: Timer },
  { id: 'headers', label: 'Headers', title: 'Headers', icon: Send },
] as const;

type TabId = (typeof TABS)[number]['id'];

// Known before any click: sidePanel.open() must run straight from the click, with no await before it.
const currentWindow = browser.windows.getCurrent().catch(() => null);

type Props = {
  // The popup closes whenever focus leaves it; the side panel stays open and follows the active tab.
  mode: 'popup' | 'sidepanel';
};

function App({ mode }: Props) {
  const { page, revision } = useActiveTab();
  const [windowId, setWindowId] = useState<number>();

  useEffect(() => {
    currentWindow.then((w) => setWindowId(w?.id));
  }, []);

  const openSidePanel = () => {
    if (windowId == null) return;
    browser.sidePanel.open({ windowId }).then(() => window.close(), console.error);
  };
  const [active, setActive] = useState<TabId>('cookies');
  const [iconFailed, setIconFailed] = useState(false);

  useEffect(() => setIconFailed(false), [page?.favIconUrl]);

  // Selection and search belong to one site: start fresh when the tab or site changes.
  const siteKey = page ? `${page.id}|${page.url.origin}` : '';

  return (
    <div
      className={`@container relative flex flex-col overflow-hidden bg-bg font-sans text-fg ${
        mode === 'popup' ? 'h-[580px] w-[600px]' : 'h-screen min-w-[280px]'
      }`}
    >
      <ToastProvider>
        <header className="border-b border-border bg-surface px-3 pt-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
              <Cookie className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[13px] leading-4 font-semibold">Site Data Editor</h1>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5" title={page?.url.href}>
                {page?.favIconUrl && !iconFailed ? (
                  <img
                    src={page.favIconUrl}
                    alt=""
                    className="size-3.5 shrink-0 rounded-sm"
                    onError={() => setIconFailed(true)}
                  />
                ) : (
                  <Globe className="size-3.5 shrink-0 text-faint" />
                )}
                <span className="truncate text-[11px] text-muted">
                  {page ? page.url.hostname : page === null ? 'No website in this tab' : 'Loading…'}
                </span>
              </div>
            </div>
            {mode === 'popup' && (
              <IconButton
                label="Open in side panel (stays open when you switch tabs)"
                onClick={openSidePanel}
                disabled={windowId == null}
              >
                <PanelRightOpen />
              </IconButton>
            )}
          </div>
          <nav className="mt-2.5 -mb-px flex gap-1 overflow-x-auto">
            {TABS.map(({ id, label, title, icon: Icon }) => (
              <button
                key={id}
                title={title}
                onClick={() => setActive(id)}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-2 pb-2 text-xs font-medium transition-colors ${
                  active === id ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-fg'
                }`}
              >
                <Icon className="size-3.5" />
                <span className="@md:hidden">{label}</span>
                <span className="hidden @md:inline">{title}</span>
              </button>
            ))}
          </nav>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          {page === undefined ? null : page === null ? (
            <EmptyState
              icon={<ShieldOff />}
              title="This page can't be edited"
              text="Browser pages like settings and the new tab page are protected. Switch to a website (http or https) and this panel updates by itself."
            />
          ) : (
            <>
              {active === 'cookies' && <CookiesPanel key={siteKey} pageUrl={page.url} />}
              {active === 'local' && (
                <StoragePanel key={`local|${siteKey}`} tabId={page.id} area="localStorage" revision={revision} />
              )}
              {active === 'session' && (
                <StoragePanel key={`session|${siteKey}`} tabId={page.id} area="sessionStorage" revision={revision} />
              )}
              {active === 'headers' && <HeadersPanel hostname={page.url.hostname} />}
            </>
          )}
        </main>
      </ToastProvider>
    </div>
  );
}

export default App;
