import { useCallback, useEffect, useState } from 'react';
import {
  cookieKey,
  listCookies,
  removeCookie,
  saveCookie,
  type Cookie,
  type CookieInput,
} from '@/utils/cookies';
import { errorMessage } from '@/utils/format';
import { useSelection } from '@/utils/useSelection';
import { CookieForm } from './CookieForm';
import { ListToolbar } from './ListToolbar';
import { Button, Notice } from './ui';

export function CookiesPanel({ pageUrl }: { pageUrl: URL }) {
  const [cookies, setCookies] = useState<Cookie[]>([]);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<Cookie | 'new' | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const { selected, toggle, setAll, clear } = useSelection();

  const load = useCallback(async () => {
    try {
      setCookies(await listCookies(pageUrl));
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [pageUrl]);

  useEffect(() => {
    load();
  }, [load]);

  const query = filter.toLowerCase();
  const visible = cookies.filter(
    (c) => c.name.toLowerCase().includes(query) || c.value.toLowerCase().includes(query),
  );
  const selectedCookies = cookies.filter((c) => selected.has(cookieKey(c)));

  const run = async (action: () => Promise<void>, done?: string) => {
    try {
      await action();
      setError('');
      setInfo(done ?? '');
      await load();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const save = (input: CookieInput) =>
    run(async () => {
      await saveCookie(input, editing === 'new' ? undefined : editing ?? undefined);
      setEditing(null);
    }, 'Saved. Reload the page if it reads cookies only on load.');

  const deleteSelected = () =>
    run(async () => {
      await Promise.all(selectedCookies.map(removeCookie));
      clear();
    }, `Deleted ${selectedCookies.length} cookie(s)`);

  const copySelected = () =>
    run(async () => {
      const data = selectedCookies.map(({ name, value, domain, path, secure, httpOnly, sameSite, expirationDate }) => ({
        name,
        value,
        domain,
        path,
        secure,
        httpOnly,
        sameSite,
        expirationDate,
      }));
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    }, `Copied ${selectedCookies.length} cookie(s) as JSON`);

  return (
    <div>
      {error && <Notice tone="error">{error}</Notice>}
      {info && <Notice tone="info">{info}</Notice>}
      <ListToolbar
        filter={filter}
        onFilter={setFilter}
        total={visible.length}
        selectedCount={selected.size}
        onToggleAll={(on) => setAll(visible.map(cookieKey), on)}
        onAdd={() => setEditing('new')}
        onDeleteSelected={deleteSelected}
        onCopySelected={copySelected}
        onRefresh={load}
      />
      {editing === 'new' && (
        <CookieForm pageUrl={pageUrl} onSave={save} onCancel={() => setEditing(null)} />
      )}
      {visible.length === 0 && editing !== 'new' && (
        <p className="py-6 text-center text-xs text-slate-400">No cookies for this page</p>
      )}
      <ul className="divide-y divide-slate-100">
        {visible.map((c) => {
          const key = cookieKey(c);
          if (editing !== 'new' && editing && cookieKey(editing) === key) {
            return (
              <li key={key} className="py-1">
                <CookieForm cookie={c} pageUrl={pageUrl} onSave={save} onCancel={() => setEditing(null)} />
              </li>
            );
          }
          return (
            <li key={key} className="flex items-start gap-2 py-1.5">
              <input type="checkbox" className="mt-0.5" checked={selected.has(key)} onChange={() => toggle(key)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="truncate text-xs font-semibold">{c.name}</span>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    {c.domain}
                    {c.path !== '/' && c.path}
                    {c.httpOnly && ' · HttpOnly'}
                    {c.secure && ' · Secure'}
                  </span>
                </div>
                <div className="truncate font-mono text-[11px] text-slate-600" title={c.value}>
                  {c.value || <em className="text-slate-400">empty</em>}
                </div>
              </div>
              <Button
                title="Copy value"
                onClick={() => run(() => navigator.clipboard.writeText(c.value), `Copied ${c.name}`)}
              >
                Copy
              </Button>
              <Button onClick={() => setEditing(c)}>Edit</Button>
              <Button variant="danger" onClick={() => run(() => removeCookie(c), `Deleted ${c.name}`)}>
                ✕
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
