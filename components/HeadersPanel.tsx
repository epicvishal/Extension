import { useEffect, useState } from 'react';
import { errorMessage } from '@/utils/format';
import { headerRules, nextRuleId, saveHeaderRules, type HeaderRule } from '@/utils/headers';
import { useSelection } from '@/utils/useSelection';
import { HeaderForm } from './HeaderForm';
import { ListToolbar } from './ListToolbar';
import { Button, Notice } from './ui';

export function HeadersPanel({ hostname }: { hostname: string }) {
  const [rules, setRules] = useState<HeaderRule[]>([]);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const { selected, toggle, setAll, clear } = useSelection();

  useEffect(() => {
    headerRules.getValue().then(setRules);
  }, []);

  const query = filter.toLowerCase();
  const visible = rules
    .filter((r) => [r.name, r.value, r.domain].some((s) => s.toLowerCase().includes(query)))
    // Rules for the current site first.
    .sort((a, b) => Number(hostname.endsWith(b.domain)) - Number(hostname.endsWith(a.domain)));

  const commit = async (next: HeaderRule[]) => {
    try {
      await saveHeaderRules(next);
      setRules(next);
      setError('');
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    }
  };

  const save = async (fields: Pick<HeaderRule, 'domain' | 'name' | 'value'>) => {
    const next =
      editing === 'new'
        ? [...rules, { id: nextRuleId(rules), enabled: true, ...fields }]
        : rules.map((r) => (r.id === editing ? { ...r, ...fields } : r));
    if (await commit(next)) setEditing(null);
  };

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setError('');
      setInfo(done);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const copySelected = () => {
    const picked = rules.filter((r) => selected.has(String(r.id)));
    const toCopy = picked.length ? picked : visible;
    const data = toCopy.map(({ domain, name, value, enabled }) => ({ domain, name, value, enabled }));
    copy(JSON.stringify(data, null, 2), `Copied ${toCopy.length} header(s) as JSON`);
  };

  const deleteSelected = async () => {
    if (await commit(rules.filter((r) => !selected.has(String(r.id))))) clear();
  };

  return (
    <div>
      {error && <Notice tone="error">{error}</Notice>}
      {info && <Notice tone="info">{info}</Notice>}
      <Notice tone="info">
        Enabled headers are added to every request to their domain. Reload the page to apply.
      </Notice>
      <ListToolbar
        filter={filter}
        onFilter={setFilter}
        total={visible.length}
        selectedCount={selected.size}
        onToggleAll={(on) => setAll(visible.map((r) => String(r.id)), on)}
        onAdd={() => setEditing('new')}
        onDeleteSelected={deleteSelected}
        onCopySelected={copySelected}
      />
      {editing === 'new' && (
        <HeaderForm
          initial={{ domain: hostname, name: '', value: '' }}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      )}
      {visible.length === 0 && editing !== 'new' && (
        <p className="py-6 text-center text-xs text-slate-400">No custom headers yet</p>
      )}
      <ul className="divide-y divide-slate-100">
        {visible.map((r) =>
          editing === r.id ? (
            <li key={r.id} className="py-1">
              <HeaderForm initial={r} onSave={save} onCancel={() => setEditing(null)} />
            </li>
          ) : (
            <li key={r.id} className="flex items-start gap-2 py-1.5">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={selected.has(String(r.id))}
                onChange={() => toggle(String(r.id))}
              />
              <div className={`min-w-0 flex-1 ${r.enabled ? '' : 'opacity-50'}`}>
                <div className="flex items-baseline gap-1.5">
                  <span className="truncate text-xs font-semibold">{r.name}</span>
                  <span className="shrink-0 text-[10px] text-slate-400">{r.domain}</span>
                </div>
                <div className="truncate font-mono text-[11px] text-slate-600" title={r.value}>
                  {r.value || <em className="text-slate-400">empty</em>}
                </div>
              </div>
              <Button
                onClick={() => commit(rules.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)))}
              >
                {r.enabled ? 'On' : 'Off'}
              </Button>
              <Button title="Copy value" onClick={() => copy(r.value, `Copied ${r.name}`)}>
                Copy
              </Button>
              <Button onClick={() => setEditing(r.id)}>Edit</Button>
              <Button variant="danger" onClick={() => commit(rules.filter((x) => x.id !== r.id))}>
                ✕
              </Button>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
