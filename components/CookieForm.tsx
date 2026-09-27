import { useState } from 'react';
import type { Cookie, CookieInput, SameSite } from '@/utils/cookies';
import { fromLocalInput, toLocalInput } from '@/utils/format';
import { Field, Input, SheetForm, Textarea, ToggleChip } from './ui';

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
    <SheetForm onSubmit={() => onSave(input)} onCancel={onCancel}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name">
          <Input value={input.name} onChange={(e) => update({ name: e.target.value })} autoFocus />
        </Field>
        <Field label="Domain">
          <Input value={input.domain} onChange={(e) => update({ domain: e.target.value })} />
        </Field>
      </div>
      <Field label="Value">
        <Textarea rows={5} value={input.value} onChange={(e) => update({ value: e.target.value })} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Path">
          <Input value={input.path} onChange={(e) => update({ path: e.target.value })} />
        </Field>
        <Field label="SameSite">
          <select
            className="h-[30px] w-full rounded-md border border-border bg-surface px-2 text-xs text-fg focus:border-accent focus:outline-none"
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
      <div>
        <span className="mb-1.5 block text-[11px] font-semibold text-muted">Flags</span>
        <div className="flex flex-wrap gap-1.5">
          <ToggleChip label="Secure" checked={input.secure} onChange={(secure) => update({ secure })} />
          <ToggleChip label="HttpOnly" checked={input.httpOnly} onChange={(httpOnly) => update({ httpOnly })} />
          <ToggleChip label="Host only" checked={input.hostOnly} onChange={(hostOnly) => update({ hostOnly })} />
          <ToggleChip
            label="Session"
            checked={isSession}
            onChange={(session) =>
              update({ expirationDate: session ? undefined : Math.floor(Date.now() / 1000) + ONE_YEAR })
            }
          />
        </div>
      </div>
    </SheetForm>
  );
}
