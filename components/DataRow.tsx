import { useState, type ReactNode } from 'react';
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

// One item in a list: checkbox, name with tags, one-line value; click to see the full value.
export function DataRow({ checked, onToggle, title, value, pills, details, actions, dimmed }: Props) {
  const [open, setOpen] = useState(false);

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
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`min-w-0 flex-1 py-1 text-left ${dimmed ? 'opacity-50' : ''}`}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <ChevronRight
              className={`size-3 shrink-0 text-faint transition-transform ${open ? 'rotate-90' : ''}`}
            />
            <span className="truncate text-[12.5px] font-semibold text-fg">{title}</span>
            {pills}
          </div>
          {!open && (
            <div className="mt-0.5 truncate pl-[18px] font-mono text-[11px] text-muted">
              {value || <em className="text-faint">empty</em>}
            </div>
          )}
        </button>
        <div className="flex shrink-0 items-center opacity-70 transition-opacity group-hover:opacity-100">
          {actions}
        </div>
      </div>
      {open && (
        <div className="mt-1 mb-1 ml-[46px] space-y-1.5 pr-1">
          <pre className="max-h-44 overflow-auto rounded-md border border-border bg-subtle p-2 font-mono text-[11px] whitespace-pre-wrap break-all text-fg">
            {value || '(empty)'}
          </pre>
          {details}
        </div>
      )}
    </li>
  );
}
