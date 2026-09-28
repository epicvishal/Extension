import { useEffect, useState } from 'react';
import { Copy, Plus, RotateCw, Search, Trash2 } from 'lucide-react';
import { Button, IconButton } from './ui';

type Props = {
  noun: string; // plural, e.g. "cookies"
  count: number; // all items, before filtering
  filter: string;
  onFilter: (value: string) => void;
  total: number; // visible items
  selectedCount: number;
  onToggleAll: (on: boolean) => void;
  onAdd: () => void;
  onDeleteSelected: () => void;
  onCopySelected?: () => void;
  onRefresh?: () => Promise<void>;
  hint?: string;
  loading?: boolean;
};

export function ListToolbar(props: Props) {
  const allSelected = props.total > 0 && props.selectedCount === props.total;
  const someSelected = props.selectedCount > 0 && !allSelected;
  // Bulk delete asks for a second click instead of a dialog.
  const [confirming, setConfirming] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    if (!props.onRefresh || refreshing) return;
    setRefreshing(true);
    await Promise.all([props.onRefresh(), new Promise((r) => setTimeout(r, 400))]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(timer);
  }, [confirming]);

  useEffect(() => setConfirming(false), [props.selectedCount]);

  const summary = props.loading ? ['Loading…'] : [
    props.filter ? `${props.total} of ${props.count} ${props.noun}` : `${props.count} ${props.noun}`,
    props.selectedCount ? `${props.selectedCount} selected` : '',
    props.hint ?? '',
  ].filter(Boolean);

  return (
    <div className="sticky top-0 z-10 border-b border-border bg-bg px-3 pt-2.5 pb-2">
      <div className="flex items-center gap-1.5">
        <label className="flex size-7 shrink-0 cursor-pointer items-center justify-center" title="Select all">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={(e) => props.onToggleAll(e.target.checked)}
          />
        </label>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint" />
          <input
            value={props.filter}
            onChange={(e) => props.onFilter(e.target.value)}
            placeholder={`Search ${props.noun}…`}
            className="h-7 w-full rounded-md border border-border bg-surface pr-2 pl-8 text-xs text-fg placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
          />
        </div>
        {props.onCopySelected && (
          <Button disabled={!props.total} onClick={props.onCopySelected} title="Copy as JSON">
            <Copy />
            {props.selectedCount ? `Copy ${props.selectedCount}` : 'Copy all'}
          </Button>
        )}
        {props.selectedCount > 0 &&
          (confirming ? (
            <Button variant="dangerSolid" onClick={props.onDeleteSelected}>
              <Trash2 />
              Confirm
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setConfirming(true)}>
              <Trash2 />
              {props.selectedCount}
            </Button>
          ))}
        {props.onRefresh && (
          <IconButton label="Reload from page" onClick={refresh} disabled={refreshing}>
            <RotateCw className={refreshing ? 'animate-spin' : ''} />
          </IconButton>
        )}
        <Button variant="primary" onClick={props.onAdd}>
          <Plus />
          Add
        </Button>
      </div>
      <div className="mt-1.5 pl-9 text-[10.5px] text-faint">{summary.join(' · ')}</div>
    </div>
  );
}
