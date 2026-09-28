import { useCallback, useEffect, useState } from 'react';
import { Cookie as CookieIcon, Copy, Pencil, Trash2 } from 'lucide-react';
import {
  cookieKey,
  listCookies,
  removeCookie,
  saveCookie,
  type Cookie,
  type CookieInput,
} from '@/utils/cookies';
import { copyText } from '@/utils/clipboard';
import { errorMessage } from '@/utils/format';
import { useSelection } from '@/utils/useSelection';
import { CookieForm } from './CookieForm';
import { DataRow } from './DataRow';
import { Details } from './Details';
import { ListToolbar } from './ListToolbar';
import { useToast } from './Toast';
import { EmptyState, IconButton, Pill, Sheet, SkeletonRows } from './ui';

const SAME_SITE_LABEL: Record<string, string> = {
  lax: 'Lax',
  strict: 'Strict',
  no_restriction: 'None',
  unspecified: 'Unspecified',
};

export function CookiesPanel({ pageUrl }: { pageUrl: URL }) {
  const [cookies, setCookies] = useState<Cookie[]>([]);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<Cookie | 'new' | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const { selected, toggle, setAll, clear } = useSelection();
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const list = await listCookies(pageUrl);
      setCookies(list);
      setLoadError('');
      return list;
    } catch (e) {
      setLoadError(errorMessage(e));
      return null;
    } finally {
      setLoading(false);
    }
  }, [pageUrl]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the list live: reload when a cookie that applies to this page changes.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChanged = ({ cookie }: { cookie: Cookie }) => {
      const domain = cookie.domain.replace(/^\./, '');
      if (pageUrl.hostname !== domain && !pageUrl.hostname.endsWith(`.${domain}`)) return;
      clearTimeout(timer);
      timer = setTimeout(load, 150);
    };
    browser.cookies.onChanged.addListener(onChanged);
    return () => {
      clearTimeout(timer);
      browser.cookies.onChanged.removeListener(onChanged);
    };
  }, [pageUrl, load]);

  const refresh = async () => {
    const list = await load();
    if (list) toast(`Up to date · ${list.length} cookie(s)`);
  };

  const query = filter.toLowerCase();
  const visible = cookies.filter(
    (c) =>
      c.name.toLowerCase().includes(query) ||
      c.value.toLowerCase().includes(query) ||
      c.domain.toLowerCase().includes(query),
  );
  const selectedCookies = cookies.filter((c) => selected.has(cookieKey(c)));
  const toCopy = selectedCookies.length ? selectedCookies : visible;

  const run = async (action: () => Promise<void>, done?: string) => {
    try {
      await action();
      if (done) toast(done);
      await load();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const save = (input: CookieInput) =>
    run(async () => {
      await saveCookie(input, editing === 'new' ? undefined : editing ?? undefined);
      setEditing(null);
    }, 'Saved. Reload the page to apply');

  const deleteSelected = () =>
    run(async () => {
      await Promise.all(selectedCookies.map(removeCookie));
      clear();
    }, `Deleted ${selectedCookies.length} cookie(s)`);

  const copySelected = () =>
    run(async () => {
      const data = toCopy.map(({ name, value, domain, path, secure, httpOnly, sameSite, expirationDate }) => ({
        name,
        value,
        domain,
        path,
        secure,
        httpOnly,
        sameSite,
        expirationDate,
      }));
      await copyText(JSON.stringify(data, null, 2));
    }, `Copied ${toCopy.length} cookie(s) as JSON`);

  const closeEditor = useCallback(() => setEditing(null), []);

  return (
    <>
      <ListToolbar
        noun="cookies"
        count={cookies.length}
        filter={filter}
        onFilter={setFilter}
        total={visible.length}
        selectedCount={selected.size}
        onToggleAll={(on) => setAll(visible.map(cookieKey), on)}
        onAdd={() => setEditing('new')}
        onDeleteSelected={deleteSelected}
        onCopySelected={copySelected}
        onRefresh={refresh}
        loading={loading}
      />
      {loading ? (
        <SkeletonRows />
      ) : loadError ? (
        <EmptyState icon={<CookieIcon />} title="Couldn't read cookies" text={loadError} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<CookieIcon />}
          title={filter ? 'No matching cookies' : 'No cookies on this page'}
          text={filter ? undefined : 'Click Add to create one.'}
        />
      ) : (
        <ul className="space-y-0.5 p-1.5">
          {visible.map((c) => {
            const key = cookieKey(c);
            return (
              <DataRow
                key={key}
                checked={selected.has(key)}
                onToggle={() => toggle(key)}
                title={c.name}
                value={c.value}
                pills={
                  <>
                    {/* The page's own host is in the header; only call out other domains. */}
                    {c.domain !== pageUrl.hostname && <Pill>{c.domain}</Pill>}
                    {c.httpOnly && <Pill tone="amber">HttpOnly</Pill>}
                    {c.secure && <Pill tone="green">Secure</Pill>}
                    {c.session && <Pill tone="blue">Session</Pill>}
                  </>
                }
                details={
                  <Details
                    items={[
                      ['Domain', c.domain],
                      ['Path', c.path],
                      ['SameSite', SAME_SITE_LABEL[c.sameSite] ?? c.sameSite],
                      [
                        'Expires',
                        c.session || !c.expirationDate
                          ? 'When the browser closes'
                          : new Date(c.expirationDate * 1000).toLocaleString(),
                      ],
                      ['Host only', c.hostOnly ? 'Yes' : 'No'],
                    ]}
                  />
                }
                actions={
                  <>
                    <IconButton
                      label="Copy value"
                      onClick={() => run(() => copyText(c.value), `Copied ${c.name}`)}
                    >
                      <Copy />
                    </IconButton>
                    <IconButton label="Edit" onClick={() => setEditing(c)}>
                      <Pencil />
                    </IconButton>
                    <IconButton
                      label="Delete"
                      tone="danger"
                      onClick={() => run(() => removeCookie(c), `Deleted ${c.name}`)}
                    >
                      <Trash2 />
                    </IconButton>
                  </>
                }
              />
            );
          })}
        </ul>
      )}
      {editing && (
        <Sheet title={editing === 'new' ? 'Add cookie' : `Edit ${editing.name}`} onClose={closeEditor}>
          <CookieForm
            cookie={editing === 'new' ? undefined : editing}
            pageUrl={pageUrl}
            onSave={save}
            onCancel={closeEditor}
          />
        </Sheet>
      )}
    </>
  );
}
