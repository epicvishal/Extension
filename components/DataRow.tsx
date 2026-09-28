import { useState, type MouseEvent, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

type Props = {
  checked: boolean;
  onToggle: () => void;
  title: string;
  value: string;
  pills?: ReactNode;
  details?: ReactNode;
  actions: ReactNode;
  dimmed?: boolean;
};

// Name and value are plain selectable text; clicking the arrow or the row's empty space expands it.
const TEXT = 'data-text';

// One item in a list: checkbox, name with tags, one-line value; expand to see the full value.
export function DataRow({ checked, onToggle, title, value, pills, details, actions, dimmed }: Props) {
  const [open, setOpen] = useState(false);

  const onRowClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(`[${TEXT}]`)) return;
    setOpen((o) => !o);
  };

  return (
    <li
      className={`group rounded-lg border px-1.5 py-1 transition-colors ${
        checked ? 'border-accent/40 bg-accent-soft/60' : 'border-transparent hover:border-border hover:bg-surface'
      }`}
    >
      <div className="flex items-start gap-1">
        <label className="flex size-7 shrink-0 cursor-pointer items-center justify-center">
          <input type="checkbox" checked={checked} onChange={onToggle} />
        </label>
        <div
          onClick={onRowClick}
          className={`min-w-0 flex-1 cursor-pointer py-1 ${dimmed ? 'opacity-50' : ''}`}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? 'Hide full value' : 'Show full value'}
              className="-m-1 shrink-0 rounded p-1 text-faint hover:bg-subtle hover:text-fg"
            >
              <ChevronRight className={`size-3 transition-transform ${open ? 'rotate-90' : ''}`} />
            </button>
            <span {...{ [TEXT]: '' }} className="max-w-[calc(100%-22px)] cursor-text truncate text-[12.5px] font-semibold text-fg">
              {title}
            </span>
            {pills}
          </div>
          {!open && (
            <div className="mt-0.5 flex min-w-0 pl-[18px]">
              <span {...{ [TEXT]: '' }} className="cursor-text truncate font-mono text-[11px] text-muted">
                {value || <em className="text-faint">empty</em>}
              </span>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center opacity-70 transition-opacity group-hover:opacity-100">
          {actions}
        </div>
      </div>
      {open && (
        <div className="mt-1 mb-1 ml-[46px] space-y-1.5 pr-1">
          <pre className="max-h-44 cursor-text overflow-auto rounded-md border border-border bg-subtle p-2 font-mono text-[11px] whitespace-pre-wrap break-all text-fg">
            {value || '(empty)'}
          </pre>
          {details}
        </div>
      )}
    </li>
  );
}
