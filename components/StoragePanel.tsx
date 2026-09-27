import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '@/utils/format';
import { readStorage, writeStorage, type PageStorageArea, type StorageEntry } from '@/utils/pageStorage';
import { useSelection } from '@/utils/useSelection';
import { EntryForm } from './EntryForm';
import { ListToolbar } from './ListToolbar';
import { Button, Notice } from './ui';

export function StoragePanel({ tabId, area }: { tabId: number; area: PageStorageArea }) {
  const [entries, setEntries] = useState<StorageEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const { selected, toggle, setAll, clear } = useSelection();

  const load = useCallback(async () => {
    try {
      setEntries(await readStorage(tabId, area));
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [tabId, area]);

  useEffect(() => {
    load();
  }, [load]);

  const query = filter.toLowerCase();
  const visible = entries.filter(
    (e) => e.key.toLowerCase().includes(query) || e.value.toLowerCase().includes(query),
  );
  const selectedEntries = entries.filter((e) => selected.has(e.key));

  const run = async (action: () => Promise<unknown>, done?: string) => {
    try {
      await action();
      setError('');
      setInfo(done ?? '');
      await load();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const save = (entry: StorageEntry) => {
    if (!entry.key) return setError('Key is required');
    const renamedFrom = editing !== 'new' && editing !== entry.key ? editing : null;
    run(async () => {
      await writeStorage(tabId, area, { set: [entry], remove: renamedFrom ? [renamedFrom] : [] });
      setEditing(null);
    }, `Saved ${entry.key}`);
  };

  const deleteSelected = () =>
    run(async () => {
      await writeStorage(tabId, area, { remove: selectedEntries.map((e) => e.key) });
      clear();
    }, `Deleted ${selectedEntries.length} item(s)`);

  const copySelected = () =>
    run(async () => {
      const data = Object.fromEntries(selectedEntries.map((e) => [e.key, e.value]));
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    }, `Copied ${selectedEntries.length} item(s) as JSON`);

  return (
    <div>
      {error && <Notice tone="error">{error}</Notice>}
      {info && <Notice tone="info">{info}</Notice>}
      <ListToolbar
        filter={filter}
        onFilter={setFilter}
        total={visible.length}
        selectedCount={selected.size}
        onToggleAll={(on) => setAll(visible.map((e) => e.key), on)}
        onAdd={() => setEditing('new')}
        onDeleteSelected={deleteSelected}
        onCopySelected={copySelected}
        onRefresh={load}
      />
      {editing === 'new' && <EntryForm onSave={save} onCancel={() => setEditing(null)} />}
      {visible.length === 0 && editing !== 'new' && (
        <p className="py-6 text-center text-xs text-slate-400">No {area} items on this page</p>
      )}
      <ul className="divide-y divide-slate-100">
        {visible.map((entry) =>
          editing === entry.key ? (
            <li key={entry.key} className="py-1">
              <EntryForm initial={entry} onSave={save} onCancel={() => setEditing(null)} />
            </li>
          ) : (
            <li key={entry.key} className="flex items-start gap-2 py-1.5">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={selected.has(entry.key)}
                onChange={() => toggle(entry.key)}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">{entry.key}</div>
                <div className="truncate font-mono text-[11px] text-slate-600" title={entry.value}>
                  {entry.value || <em className="text-slate-400">empty</em>}
                </div>
              </div>
              <Button onClick={() => setEditing(entry.key)}>Edit</Button>
              <Button
                variant="danger"
                onClick={() => run(() => writeStorage(tabId, area, { remove: [entry.key] }), `Deleted ${entry.key}`)}
              >
                ✕
              </Button>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
