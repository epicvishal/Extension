import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronRight, CircleCheck, Copy, Search, Terminal, Trash2 } from 'lucide-react';
import { copyText } from '@/utils/clipboard';
import { errorMessage } from '@/utils/format';
import { isNetworkError, readRequests, type NetworkEntry } from '@/utils/pageHook';
import { CaptureControls } from './CaptureControls';
import { CopyButton } from './CopyButton';
import { useToast } from './Toast';
import { EmptyState, IconButton } from './ui';

type Row = { kind: 'request'; key: string; entry: NetworkEntry } | { kind: 'reload'; key: string };
type View = 'errors' | 'all';

const POLL_MS = 1000;
const MAX_ROWS = 500;

const clock = (time: number) =>
  new Date(time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

const duration = (ms?: number) => (ms == null ? '' : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

// JSON bodies are much easier to read indented.
const pretty = (body: string) => {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
};

// Placeholders the page script stores instead of a body it can't show as text, e.g. "[Blob …]".
const isPlaceholder = (body: string) =>
  /^\[(Blob |binary, |Document\]|file |dropped to save memory\]|[A-Za-z]+ (body|response)|[A-Z][A-Za-z]+\]$)/.test(body);

const headerText = (headers: [string, string][] = []) => headers.map(([name, value]) => `${name}: ${value}`).join('\n');

const statusLine = (e: NetworkEntry) =>
  e.failed ? `Failed: ${e.failed}` : e.done ? `${e.status} ${e.statusText ?? ''}`.trim() : 'Pending';

// Everything about one call as plain text, for pasting into a ticket or chat.
function allDetailsText(e: NetworkEntry) {
  return [
    `${e.method} ${e.url}`,
    `Status: ${statusLine(e)}`,
    '',
    'Request headers:',
    headerText(e.requestHeaders) || '(none)',
    '',
    'Request body:',
    e.requestBody ?? '(none)',
    '',
    'Response headers:',
    headerText(e.responseHeaders) || '(none)',
    '',
    'Response body:',
    e.responseBody != null ? pretty(e.responseBody) : '(none)',
  ].join('\n');
}

const quote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

function toCurl(e: NetworkEntry) {
  const body = e.requestBody && !isPlaceholder(e.requestBody) ? e.requestBody : undefined;
  const parts = [`curl ${quote(e.url)}`];
  if (e.method !== 'GET' || body) parts.push(`-X ${e.method}`);
  for (const [name, value] of e.requestHeaders ?? []) parts.push(`-H ${quote(`${name}: ${value}`)}`);
  if (body) parts.push(`--data-raw ${quote(body)}`);
  return parts.join(' \\\n  ');
}

function StatusBadge({ entry }: { entry: NetworkEntry }) {
  const [label, tone] = !entry.done
    ? ['…', 'bg-subtle text-faint']
    : entry.failed
      ? ['Failed', 'bg-danger text-white']
      : (entry.status ?? 0) >= 500
        ? [String(entry.status), 'bg-danger text-white']
        : (entry.status ?? 0) >= 400
          ? [String(entry.status), 'bg-amber-500 text-white']
          : [String(entry.status || '—'), 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'];
  return (
    <span className={`w-12 shrink-0 rounded px-1 text-center font-mono text-[10.5px] leading-[18px] font-semibold ${tone}`}>
      {label}
    </span>
  );
}

function Section({ title, copy, children }: { title: string; copy?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex min-h-6 items-center justify-between gap-2">
        <span className="text-[10.5px] font-semibold tracking-wide text-faint uppercase">{title}</span>
        {copy ? <CopyButton text={copy} what={title.toLowerCase()} /> : null}
      </div>
      {children}
    </div>
  );
}

const codeBlock =
  'cursor-text overflow-auto rounded-md border border-border bg-subtle p-2 font-mono text-[11px] break-all whitespace-pre-wrap text-fg';

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-[11px] text-faint italic">{children}</p>;
}

function HeaderTable({ headers }: { headers?: [string, string][] }) {
  if (!headers?.length) return <Empty>None</Empty>;
  return (
    <dl className="grid max-h-48 grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 overflow-auto rounded-md border border-border bg-subtle p-2 font-mono text-[11px]">
      {headers.map(([name, value], i) => (
        <div key={`${name}-${i}`} className="contents">
          <dt className="cursor-text text-muted">{name}</dt>
          <dd className="cursor-text break-all text-fg">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Details({ entry }: { entry: NetworkEntry }) {
  const error = isNetworkError(entry);
  const responseBody = entry.responseBody != null ? pretty(entry.responseBody) : undefined;
  const requestBody = entry.requestBody != null ? pretty(entry.requestBody) : undefined;

  return (
    <div className="space-y-3 border-t border-border bg-surface px-3 py-2.5">
      <div className="flex flex-wrap gap-1.5">
        <CopyButton text={toCurl(entry)} what="request as cURL" label="Copy as cURL" variant="primary" />
        <CopyButton text={entry.url} what="URL" label="Copy URL" />
        <CopyButton text={allDetailsText(entry)} what="all details" label="Copy all details" />
      </div>

      <Section title="General">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px]">
          <dt className="text-faint">URL</dt>
          <dd className="cursor-text font-mono break-all text-fg">{entry.url}</dd>
          <dt className="text-faint">Method</dt>
          <dd className="font-mono text-fg">{entry.method}</dd>
          <dt className="text-faint">Status</dt>
          <dd className={error ? 'text-danger' : 'text-fg'}>{statusLine(entry)}</dd>
          <dt className="text-faint">Type</dt>
          <dd className="text-fg">{entry.type === 'fetch' ? 'fetch' : 'XMLHttpRequest'}</dd>
          <dt className="text-faint">Started</dt>
          <dd className="text-fg">
            {clock(entry.start)}
            {entry.duration != null && ` · took ${duration(entry.duration)}`}
          </dd>
        </dl>
      </Section>

      <Section title="Request headers" copy={headerText(entry.requestHeaders) || undefined}>
        <HeaderTable headers={entry.requestHeaders} />
        <p className="mt-1 text-[10.5px] text-faint">
          Headers set by the page's code. The browser adds cookies and a few others on its own.
        </p>
      </Section>

      <Section title="Request body" copy={requestBody}>
        {requestBody != null ? <pre className={`max-h-48 ${codeBlock}`}>{requestBody}</pre> : <Empty>No request body</Empty>}
      </Section>

      <Section title="Response headers" copy={headerText(entry.responseHeaders) || undefined}>
        {entry.done && !entry.failed ? <HeaderTable headers={entry.responseHeaders} /> : <Empty>{entry.failed ? 'No response' : 'Waiting for the response…'}</Empty>}
      </Section>

      <Section title="Response body" copy={responseBody}>
        {!entry.done ? (
          <Empty>Waiting for the response…</Empty>
        ) : entry.failed ? (
          <Empty>No response: {entry.failed}</Empty>
        ) : responseBody == null ? (
          <Empty>Reading…</Empty>
        ) : (
          <pre className={`max-h-72 ${codeBlock}`}>{responseBody || '(empty body)'}</pre>
        )}
      </Section>
    </div>
  );
}

export function NetworkPanel({ tabId, pageUrl }: { tabId: number; pageUrl: URL }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [view, setView] = useState<View>('errors');
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [unavailable, setUnavailable] = useState('');
  const cursor = useRef({ session: '', seq: 0 });
  const toast = useToast();

  // Merge new and updated requests. Rows are keyed by page session, since ids restart on reload.
  const apply = useCallback((session: string, entries: NetworkEntry[]) => {
    setRows((prev) => {
      const next = [...prev];
      const index = new Map(next.map((r, i) => [r.key, i]));
      for (const entry of entries) {
        const key = `${session}:${entry.id}`;
        const row: Row = { kind: 'request', key, entry };
        const at = index.get(key);
        if (at === undefined) {
          index.set(key, next.length);
          next.push(row);
        } else {
          next[at] = row;
        }
      }
      return next.length > MAX_ROWS ? next.slice(-MAX_ROWS) : next;
    });
  }, []);

  const poll = useCallback(async () => {
    try {
      let result = await readRequests(tabId, cursor.current.seq);
      if (result.session !== cursor.current.session) {
        const reloaded = cursor.current.session !== '';
        cursor.current = { session: result.session, seq: 0 };
        result = await readRequests(tabId, 0);
        if (reloaded) setRows((prev) => [...prev, { kind: 'reload', key: `reload:${result.session}` }]);
      }
      if (result.entries.length) {
        cursor.current.seq = Math.max(...result.entries.map((e) => e.seq));
        apply(result.session, result.entries);
      }
      setUnavailable('');
    } catch (e) {
      // Often just a navigation in progress; the next poll usually succeeds.
      setUnavailable(errorMessage(e));
    }
  }, [tabId, apply]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      await poll();
      if (!stopped) timer = setTimeout(loop, POLL_MS);
    };
    loop();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [poll]);

  const copy = async (text: string, what: string) => {
    try {
      await copyText(text);
      toast(`Copied ${what}`);
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const requests = rows.filter((r): r is Extract<Row, { kind: 'request' }> => r.kind === 'request');
  const errorCount = requests.filter((r) => isNetworkError(r.entry)).length;
  const query = filter.toLowerCase();
  const visible = rows.filter((r) => {
    if (r.kind === 'reload') return view === 'all' && !query;
    if (view === 'errors' && !isNetworkError(r.entry)) return false;
    return !query || `${r.entry.method} ${r.entry.url} ${r.entry.status ?? ''}`.toLowerCase().includes(query);
  });

  const copyAll = () => {
    const shown = visible.filter((r): r is Extract<Row, { kind: 'request' }> => r.kind === 'request');
    const text = shown
      .map(({ entry: e }) => {
        const line = `${e.failed ? 'FAILED' : e.status} ${e.method} ${e.url}`;
        return e.responseBody ? `${line}\n${pretty(e.responseBody)}` : line;
      })
      .join('\n\n');
    copy(text, `${shown.length} call(s)`);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-bg px-3 pt-2.5 pb-2">
        <div className="flex items-center gap-1.5">
          <div className="flex shrink-0 rounded-md border border-border bg-surface p-0.5">
            {(['errors', 'all'] as const).map((id) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  view === id ? 'bg-accent-soft text-accent' : 'text-muted hover:text-fg'
                }`}
              >
                {id === 'errors' ? 'Errors' : 'All'}
                {id === 'errors' && errorCount > 0 && (
                  <span className="rounded-full bg-danger px-1 text-[10px] leading-4 text-white">{errorCount}</span>
                )}
                {id === 'all' && requests.length > 0 && (
                  <span className="text-[10px] text-faint">{requests.length}</span>
                )}
              </button>
            ))}
          </div>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter URL, method, status…"
              className="h-7 w-full rounded-md border border-border bg-surface pr-2 pl-8 text-xs text-fg placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
            />
          </div>
          <IconButton label="Copy shown calls" onClick={copyAll} disabled={!visible.length}>
            <Copy />
          </IconButton>
          <IconButton label="Clear" onClick={() => setRows([])}>
            <Trash2 />
          </IconButton>
        </div>
        <CaptureControls tabId={tabId} pageUrl={pageUrl} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {unavailable && (
          <div className="border-b border-border px-3 py-1.5 text-[11px] text-faint">
            Can't read this page right now: {unavailable}
          </div>
        )}
        {visible.length === 0 ? (
          view === 'errors' && !query ? (
            <EmptyState
              icon={<CircleCheck />}
              title="No failed API calls"
              text={`Failed fetch and XHR calls from ${pageUrl.hostname} appear here with their response. Calls made before this tab opened aren't shown: turn on Capture from page load and reload to catch them.`}
            />
          ) : (
            <EmptyState
              icon={<Terminal />}
              title={query ? 'No matching calls' : 'No API calls yet'}
              text={query ? undefined : 'fetch and XHR calls the page makes from now on appear here.'}
            />
          )
        ) : (
          visible.map((row) => {
            if (row.kind === 'reload') {
              return (
                <div key={row.key} className="border-b border-border px-3 py-1 text-[11px] text-faint italic">
                  Page reloaded
                </div>
              );
            }
            const { entry } = row;
            const expanded = open.has(row.key);
            let path = entry.url;
            let host = '';
            try {
              const u = new URL(entry.url);
              path = `${u.pathname}${u.search}`;
              if (u.host !== pageUrl.host) host = u.host;
            } catch {
              // Keep the raw URL.
            }
            return (
              <div key={row.key} className="border-b border-border">
                <button
                  type="button"
                  onClick={() => toggle(row.key)}
                  aria-expanded={expanded}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-surface ${
                    isNetworkError(entry) ? 'bg-danger-soft/40' : ''
                  }`}
                >
                  <ChevronRight
                    className={`size-3 shrink-0 text-faint transition-transform ${expanded ? 'rotate-90' : ''}`}
                  />
                  <StatusBadge entry={entry} />
                  <span className="w-11 shrink-0 font-mono text-[10.5px] font-semibold text-muted">{entry.method}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg" title={entry.url}>
                    {path}
                    {host && <span className="ml-1.5 text-faint">{host}</span>}
                  </span>
                  <span className="hidden shrink-0 text-[10.5px] text-faint @sm:inline">{duration(entry.duration)}</span>
                  <span className="shrink-0 text-[10.5px] text-faint">{clock(entry.start)}</span>
                </button>
                {expanded && <Details entry={entry} />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
