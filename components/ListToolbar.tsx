import { Button, Input } from './ui';

type Props = {
  filter: string;
  onFilter: (value: string) => void;
  total: number;
  selectedCount: number;
  onToggleAll: (on: boolean) => void;
  onAdd: () => void;
  onDeleteSelected: () => void;
  onCopySelected?: () => void;
  onRefresh?: () => void;
};

export function ListToolbar(props: Props) {
  const allSelected = props.total > 0 && props.selectedCount === props.total;
  return (
    <div className="mb-2 flex items-center gap-1.5">
      <input
        type="checkbox"
        title="Select all"
        checked={allSelected}
        onChange={(e) => props.onToggleAll(e.target.checked)}
      />
      <Input
        placeholder="Filter…"
        value={props.filter}
        onChange={(e) => props.onFilter(e.target.value)}
        className="flex-1"
      />
      <Button variant="primary" onClick={props.onAdd}>
        + Add
      </Button>
      {props.onCopySelected && (
        <Button disabled={!props.total} onClick={props.onCopySelected} title="Copy as JSON">
          {props.selectedCount ? `Copy (${props.selectedCount})` : 'Copy all'}
        </Button>
      )}
      <Button variant="danger" disabled={!props.selectedCount} onClick={props.onDeleteSelected}>
        Delete ({props.selectedCount})
      </Button>
      {props.onRefresh && (
        <Button title="Reload from the page" onClick={props.onRefresh}>
          ↻
        </Button>
      )}
    </div>
  );
}
