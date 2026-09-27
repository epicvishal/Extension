import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { X } from 'lucide-react';

const buttonVariants = {
  primary: 'bg-accent text-white shadow-sm hover:bg-accent-hover',
  secondary: 'border border-border bg-surface text-fg hover:bg-subtle',
  ghost: 'text-muted hover:bg-subtle hover:text-fg',
  danger: 'border border-border bg-surface text-danger hover:bg-danger-soft',
  dangerSolid: 'bg-danger text-white hover:opacity-90',
};

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonVariants }) {
  return (
    <button
      className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2.5 text-xs font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-3.5 ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  );
}

export function IconButton({
  label,
  tone = 'default',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: 'default' | 'danger' }) {
  const toneClass =
    tone === 'danger' ? 'hover:bg-danger-soft hover:text-danger' : 'hover:bg-subtle hover:text-fg';
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors disabled:opacity-40 [&_svg]:size-3.5 ${toneClass} ${className}`}
      {...props}
    />
  );
}

const fieldClass =
  'w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-fg placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none disabled:opacity-50';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClass} ${className}`} {...props} />;
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldClass} resize-y font-mono break-all ${className}`} rows={4} {...props} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10.5px] text-faint">{hint}</span>}
    </label>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={label}
      onClick={() => onChange(!checked)}
      className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-border'}`}
    >
      <span
        className={`absolute top-0.5 left-0 size-3 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-3.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

// A labelled on/off chip, used for cookie flags.
export function ToggleChip({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
        checked ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted hover:bg-subtle'
      }`}
    >
      {label}
    </button>
  );
}

const pillTones = {
  neutral: 'bg-subtle text-muted',
  amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  green: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  blue: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  violet: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
};

export function Pill({ tone = 'neutral', children }: { tone?: keyof typeof pillTones; children: ReactNode }) {
  return (
    <span className={`shrink-0 rounded px-1.5 py-px text-[10px] leading-4 font-medium ${pillTones[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-subtle text-faint [&_svg]:size-5">
        {icon}
      </div>
      <p className="text-xs font-semibold text-fg">{title}</p>
      {text && <p className="mt-1 max-w-xs text-[11px] text-muted">{text}</p>}
    </div>
  );
}

// Slide-up panel over the popup, used for add/edit forms.
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-black/35" onClick={onClose}>
      <div
        className="mt-auto flex max-h-[92%] flex-col rounded-t-2xl border-t border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-sm font-semibold text-fg">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

// Body + footer layout for forms inside a Sheet.
export function SheetForm({
  onSubmit,
  onCancel,
  children,
}: {
  onSubmit: () => void;
  onCancel: () => void;
  children: ReactNode;
}) {
  return (
    <form
      className="flex min-h-0 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="min-h-0 space-y-3 overflow-y-auto px-4 pb-3">{children}</div>
      <div className="flex justify-end gap-2 border-t border-border px-4 py-2.5">
        <Button type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Save
        </Button>
      </div>
    </form>
  );
}
