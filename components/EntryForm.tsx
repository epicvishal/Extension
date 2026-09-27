import { useState } from 'react';
import { Button, Field, Input, Textarea } from './ui';

type Props = {
  initial?: { key: string; value: string };
  keyLabel?: string;
  onSave: (entry: { key: string; value: string }) => void;
  onCancel: () => void;
};

export function EntryForm({ initial, keyLabel = 'Key', onSave, onCancel }: Props) {
  const [key, setKey] = useState(initial?.key ?? '');
  const [value, setValue] = useState(initial?.value ?? '');

  return (
    <form
      className="space-y-2 rounded border border-slate-200 bg-slate-50 p-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ key, value });
      }}
    >
      <Field label={keyLabel}>
        <Input value={key} onChange={(e) => setKey(e.target.value)} autoFocus />
      </Field>
      <Field label="Value">
        <Textarea rows={5} value={value} onChange={(e) => setValue(e.target.value)} />
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
