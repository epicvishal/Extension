import { useState } from 'react';
import type { Cookie, CookieInput, SameSite } from '@/utils/cookies';
import { fromLocalInput, toLocalInput } from '@/utils/format';
import { Button, Checkbox, Field, Input, Textarea } from './ui';

const ONE_YEAR = 365 * 24 * 60 * 60;

function initialInput(cookie: Cookie | undefined, pageUrl: URL): CookieInput {
  if (cookie) {
    return {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      hostOnly: cookie.hostOnly,
      expirationDate: cookie.session ? undefined : cookie.expirationDate,
    };
  }
  return {
    name: '',
    value: '',
    domain: pageUrl.hostname,
    path: '/',
    secure: pageUrl.protocol === 'https:',
    httpOnly: false,
    sameSite: 'lax',
    hostOnly: true,
    expirationDate: Math.floor(Date.now() / 1000) + ONE_YEAR,
  };
}

type Props = {
  cookie?: Cookie;
  pageUrl: URL;
  onSave: (input: CookieInput) => void;
  onCancel: () => void;
};

export function CookieForm({ cookie, pageUrl, onSave, onCancel }: Props) {
  const [input, setInput] = useState(() => initialInput(cookie, pageUrl));
  const update = (patch: Partial<CookieInput>) => setInput((prev) => ({ ...prev, ...patch }));
  const isSession = input.expirationDate === undefined;

  return (
    <form
      className="space-y-2 rounded border border-slate-200 bg-slate-50 p-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(input);
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <Field label="Name">
          <Input value={input.name} onChange={(e) => update({ name: e.target.value })} autoFocus />
        </Field>
        <Field label="Domain">
          <Input value={input.domain} onChange={(e) => update({ domain: e.target.value })} />
        </Field>
      </div>
      <Field label="Value">
        <Textarea value={input.value} onChange={(e) => update({ value: e.target.value })} />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Path">
          <Input value={input.path} onChange={(e) => update({ path: e.target.value })} />
        </Field>
        <Field label="SameSite">
          <select
            className="w-full rounded border border-slate-300 px-1 py-1 text-xs"
            value={input.sameSite}
            onChange={(e) => update({ sameSite: e.target.value as SameSite })}
          >
            <option value="lax">Lax</option>
            <option value="strict">Strict</option>
            <option value="no_restriction">None</option>
            <option value="unspecified">Unspecified</option>
          </select>
        </Field>
        <Field label="Expires">
          <Input
            type="datetime-local"
            disabled={isSession}
            value={isSession ? '' : toLocalInput(input.expirationDate!)}
            onChange={(e) => e.target.value && update({ expirationDate: fromLocalInput(e.target.value) })}
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        <Checkbox label="Secure" checked={input.secure} onChange={(secure) => update({ secure })} />
        <Checkbox label="HttpOnly" checked={input.httpOnly} onChange={(httpOnly) => update({ httpOnly })} />
        <Checkbox label="Host only" checked={input.hostOnly} onChange={(hostOnly) => update({ hostOnly })} />
        <Checkbox
          label="Session cookie"
          checked={isSession}
          onChange={(session) =>
            update({ expirationDate: session ? undefined : Math.floor(Date.now() / 1000) + ONE_YEAR })
          }
        />
      </div>
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
