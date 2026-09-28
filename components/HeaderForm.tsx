import { useState } from 'react';
import type { HeaderRule } from '@/utils/headers';
import { Field, Input, SheetForm, Textarea } from './ui';

type Fields = Pick<HeaderRule, 'domain' | 'name' | 'value'>;

type Props = {
  initial: Fields;
  onSave: (rule: Fields) => void;
  onCancel: () => void;
};

export function HeaderForm({ initial, onSave, onCancel }: Props) {
  const [rule, setRule] = useState(initial);
  const update = (patch: Partial<Fields>) => setRule((prev) => ({ ...prev, ...patch }));

  return (
    <SheetForm onSubmit={() => onSave(rule)} onCancel={onCancel}>
      <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
        <Field label="Header name">
          <Input
            placeholder="Authorization"
            value={rule.name}
            onChange={(e) => update({ name: e.target.value })}
            autoFocus
          />
        </Field>
        <Field label="Domain" hint="Subdomains are included">
          <Input value={rule.domain} onChange={(e) => update({ domain: e.target.value })} />
        </Field>
      </div>
      <Field label="Value">
        <Textarea rows={4} value={rule.value} onChange={(e) => update({ value: e.target.value })} />
      </Field>
    </SheetForm>
  );
}
