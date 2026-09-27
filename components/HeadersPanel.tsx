import { useCallback, useEffect, useState } from 'react';
import { Copy, Pencil, Send, Trash2 } from 'lucide-react';
import { errorMessage } from '@/utils/format';
import { headerRules, nextRuleId, saveHeaderRules, type HeaderRule } from '@/utils/headers';
import { useSelection } from '@/utils/useSelection';
import { DataRow } from './DataRow';
import { HeaderForm } from './HeaderForm';
import { ListToolbar } from './ListToolbar';
import { useToast } from './Toast';
import { EmptyState, IconButton, Pill, Sheet, Switch } from './ui';

const appliesTo = (hostname: string, domain: string) => hostname === domain || hostname.endsWith(`.${domain}`);

export function HeadersPanel({ hostname }: { hostname: string }) {
  const [rules, setRules] = useState<HeaderRule[]>([]);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<HeaderRule | 'new' | null>(null);
  const { selected, toggle, setAll, clear } = useSelection();
  const toast = useToast();

  useEffect(() => {
    headerRules.getValue().then(setRules);
  }, []);

  const query = filter.toLowerCase();
  const visible = rules
    .filter((r) => [r.name, r.value, r.domain].some((s) => s.toLowerCase().includes(query)))
    // Rules for the current site first.
    .sort((a, b) => Number(appliesTo(hostname, b.domain)) - Number(appliesTo(hostname, a.domain)));

  const commit = async (next: HeaderRule[], done?: string) => {
    try {
      await saveHeaderRules(next);
      setRules(next);
      if (done) toast(done);
      return true;
    } catch (e) {
      toast(errorMessage(e), 'error');
      return false;
    }
  };

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(done);
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const save = async (fields: Pick<HeaderRule, 'domain' | 'name' | 'value'>) => {
    const next =
      editing === 'new'
        ? [...rules, { id: nextRuleId(rules), enabled: true, ...fields }]
        : rules.map((r) => (editing && r.id === editing.id ? { ...r, ...fields } : r));
    if (await commit(next, 'Saved. Reload the page to apply')) setEditing(null);
  };

  const copySelected = () => {
    const picked = rules.filter((r) => selected.has(String(r.id)));
    const toCopy = picked.length ? picked : visible;
    const data = toCopy.map(({ domain, name, value, enabled }) => ({ domain, name, value, enabled }));
    copy(JSON.stringify(data, null, 2), `Copied ${toCopy.length} header(s) as JSON`);
  };

  const deleteSelected = async () => {
    const count = selected.size;
    if (await commit(rules.filter((r) => !selected.has(String(r.id))), `Deleted ${count} header(s)`)) clear();
  };

  const closeEditor = useCallback(() => setEditing(null), []);

  return (
    <>
      <ListToolbar
        noun="headers"
        count={rules.length}
        filter={filter}
        onFilter={setFilter}
        total={visible.length}
        selectedCount={selected.size}
        onToggleAll={(on) => setAll(visible.map((r) => String(r.id)), on)}
        onAdd={() => setEditing('new')}
        onDeleteSelected={deleteSelected}
        onCopySelected={copySelected}
        hint="sent with every request to the domain"
      />
      {visible.length === 0 ? (
        <EmptyState
          icon={<Send />}
          title={filter ? 'No matching headers' : 'No custom headers yet'}
          text={
            filter
              ? undefined
              : 'Add a header like Authorization or X-Tenant-Id and it will be sent with every request to that domain.'
          }
        />
      ) : (
        <ul className="space-y-0.5 p-1.5">
          {visible.map((r) => {
            const key = String(r.id);
            return (
              <DataRow
                key={key}
                checked={selected.has(key)}
                onToggle={() => toggle(key)}
                title={r.name}
                value={r.value}
                dimmed={!r.enabled}
                pills={
                  <>
                    {r.domain !== hostname && <Pill>{r.domain}</Pill>}
                    {appliesTo(hostname, r.domain) && <Pill tone="green">This site</Pill>}
                  </>
                }
                actions={
                  <>
                    <span className="px-1.5">
                      <Switch
                        label={r.enabled ? 'On: click to turn off' : 'Off: click to turn on'}
                        checked={r.enabled}
                        onChange={(enabled) =>
                          commit(
                            rules.map((x) => (x.id === r.id ? { ...x, enabled } : x)),
                            `${r.name} turned ${enabled ? 'on' : 'off'}`,
                          )
                        }
                      />
                    </span>
                    <IconButton label="Copy value" onClick={() => copy(r.value, `Copied ${r.name}`)}>
                      <Copy />
                    </IconButton>
                    <IconButton label="Edit" onClick={() => setEditing(r)}>
                      <Pencil />
                    </IconButton>
                    <IconButton
                      label="Delete"
                      tone="danger"
                      onClick={() => commit(rules.filter((x) => x.id !== r.id), `Deleted ${r.name}`)}
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
        <Sheet title={editing === 'new' ? 'Add header' : `Edit ${editing.name}`} onClose={closeEditor}>
          <HeaderForm
            initial={editing === 'new' ? { domain: hostname, name: '', value: '' } : editing}
            onSave={save}
            onCancel={closeEditor}
          />
        </Sheet>
      )}
    </>
  );
}
