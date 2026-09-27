import { useState } from 'react';
import { Field, Input, SheetForm, Textarea } from './ui';

type Props = {
  initial?: { key: string; value: string };
  onSave: (entry: { key: string; value: string }) => void;
  onCancel: () => void;
};

export function EntryForm({ initial, onSave, onCancel }: Props) {
  const [key, setKey] = useState(initial?.key ?? '');
  const [value, setValue] = useState(initial?.value ?? '');

  return (
    <SheetForm onSubmit={() => onSave({ key, value })} onCancel={onCancel}>
      <Field label="Key">
        <Input value={key} onChange={(e) => setKey(e.target.value)} autoFocus />
      </Field>
      <Field label="Value">
        <Textarea rows={8} value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
    </SheetForm>
  );
}
