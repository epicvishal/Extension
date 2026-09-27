import { useCallback, useEffect, useState } from 'react';
import { Copy, Database, Pencil, Trash2 } from 'lucide-react';
import { errorMessage } from '@/utils/format';
import { readStorage, writeStorage, type PageStorageArea, type StorageEntry } from '@/utils/pageStorage';
import { useSelection } from '@/utils/useSelection';
import { DataRow } from './DataRow';
import { EntryForm } from './EntryForm';
import { ListToolbar } from './ListToolbar';
import { useToast } from './Toast';
import { EmptyState, IconButton, Pill, Sheet } from './ui';

const AREA_LABEL: Record<PageStorageArea, string> = {
  localStorage: 'local storage',
  sessionStorage: 'session storage',
};

// JSON values get a tag so they're easy to spot.
const looksLikeJson = (value: string) => /^\s*[[{]/.test(value);

export function StoragePanel({ tabId, area }: { tabId: number; area: PageStorageArea }) {
  const [entries, setEntries] = useState<StorageEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<StorageEntry | 'new' | null>(null);
  const [loadError, setLoadError] = useState('');
  const { selected, toggle, setAll, clear } = useSelection();
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      setEntries(await readStorage(tabId, area));
      setLoadError('');
    } catch (e) {
      setLoadError(errorMessage(e));
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
  const toCopy = selectedEntries.length ? selectedEntries : visible;

  const run = async (action: () => Promise<unknown>, done?: string) => {
    try {
      await action();
      if (done) toast(done);
      await load();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const save = (entry: StorageEntry) => {
    if (!entry.key) return toast('Key is required', 'error');
    const renamedFrom = editing !== 'new' && editing && editing.key !== entry.key ? editing.key : null;
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
      const data = Object.fromEntries(toCopy.map((e) => [e.key, e.value]));
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    }, `Copied ${toCopy.length} item(s) as JSON`);

  const closeEditor = useCallback(() => setEditing(null), []);

  return (
    <>
      <ListToolbar
        noun="items"
        count={entries.length}
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
      {loadError ? (
        <EmptyState icon={<Database />} title={`Couldn't read ${AREA_LABEL[area]}`} text={loadError} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Database />}
          title={filter ? 'No matching items' : `Nothing in ${AREA_LABEL[area]}`}
          text={filter ? undefined : 'Click Add to create an item.'}
        />
      ) : (
        <ul className="space-y-0.5 p-1.5">
          {visible.map((entry) => (
            <DataRow
              key={entry.key}
              checked={selected.has(entry.key)}
              onToggle={() => toggle(entry.key)}
              title={entry.key}
              value={entry.value}
              pills={looksLikeJson(entry.value) ? <Pill tone="violet">JSON</Pill> : undefined}
              actions={
                <>
                  <IconButton
                    label="Copy value"
                    onClick={() => run(() => navigator.clipboard.writeText(entry.value), `Copied ${entry.key}`)}
                  >
                    <Copy />
                  </IconButton>
                  <IconButton label="Edit" onClick={() => setEditing(entry)}>
                    <Pencil />
                  </IconButton>
                  <IconButton
                    label="Delete"
                    tone="danger"
                    onClick={() =>
                      run(() => writeStorage(tabId, area, { remove: [entry.key] }), `Deleted ${entry.key}`)
                    }
                  >
                    <Trash2 />
                  </IconButton>
                </>
              }
            />
          ))}
        </ul>
      )}
      {editing && (
        <Sheet title={editing === 'new' ? 'Add item' : `Edit ${editing.key}`} onClose={closeEditor}>
          <EntryForm initial={editing === 'new' ? undefined : editing} onSave={save} onCancel={closeEditor} />
        </Sheet>
      )}
    </>
  );
}
