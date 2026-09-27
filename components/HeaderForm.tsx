import { useState } from 'react';
import type { HeaderRule } from '@/utils/headers';
import { Button, Field, Input } from './ui';

type Props = {
  initial: Pick<HeaderRule, 'domain' | 'name' | 'value'>;
  onSave: (rule: Pick<HeaderRule, 'domain' | 'name' | 'value'>) => void;
  onCancel: () => void;
};

export function HeaderForm({ initial, onSave, onCancel }: Props) {
  const [rule, setRule] = useState(initial);
  const update = (patch: Partial<typeof rule>) => setRule((prev) => ({ ...prev, ...patch }));

  return (
    <form
      className="space-y-2 rounded border border-slate-200 bg-slate-50 p-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(rule);
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <Field label="Header name">
          <Input
            placeholder="Authorization"
            value={rule.name}
            onChange={(e) => update({ name: e.target.value })}
            autoFocus
          />
        </Field>
        <Field label="Domain (subdomains included)">
          <Input value={rule.domain} onChange={(e) => update({ domain: e.target.value })} />
        </Field>
      </div>
      <Field label="Value">
        <Input value={rule.value} onChange={(e) => update({ value: e.target.value })} className="font-mono" />
      </Field>
      <div className="flex justify-end gap-1.5">
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
