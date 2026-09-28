import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronRight, Copy, CornerDownLeft, RotateCw, Search, Trash2 } from 'lucide-react';
import { errorMessage } from '@/utils/format';
import { getCaptureOnLoad, readLogs, runCode, setCaptureOnLoad, type LogLevel } from '@/utils/pageConsole';
import { useToast } from './Toast';
import { Button, IconButton, Switch } from './ui';

type Item =
  | { kind: 'log'; key: string; time: number; level: LogLevel; text: string }
  | { kind: 'input'; key: string; time: number; text: string }
  | { kind: 'result'; key: string; time: number; ok: boolean; text: string }
  | { kind: 'system'; key: string; time: number; text: string };

type LevelFilter = 'all' | 'error' | 'warn' | 'log';

const MAX_ITEMS = 2000;
const POLL_MS = 1000;

const LEVEL_FILTERS: { id: LevelFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'error', label: 'Errors' },
  { id: 'warn', label: 'Warnings' },
  { id: 'log', label: 'Logs' },
];

const matchesLevel = (item: Item, filter: LevelFilter) => {
  if (filter === 'all') return true;
  if (item.kind !== 'log') return false;
  if (filter === 'log') return item.level === 'log' || item.level === 'info' || item.level === 'debug';
  return item.level === filter;
};

const levelRow: Record<LogLevel, string> = {
  error: 'bg-danger-soft text-danger',
  warn: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  info: 'text-sky-700 dark:text-sky-300',
  debug: 'text-faint',
  log: 'text-fg',
};

const clock = (time: number) =>
  new Date(time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

let nextKey = 0;
const key = () => String(++nextKey);

export function ConsolePanel({ tabId, pageUrl }: { tabId: number; pageUrl: URL }) {
  const [items, setItems] = useState<Item[]>(() => [
    {
      kind: 'system',
      key: key(),
      time: Date.now(),
      text: `Showing console messages from ${pageUrl.hostname} since this tab was opened. Turn on "Capture from page load" and reload to see them from the start.`,
    },
  ]);
  const [level, setLevel] = useState<LevelFilter>('all');
  const [filter, setFilter] = useState('');
  const [code, setCode] = useState('');
  const [running, setRunning] = useState(false);
  const [captureOnLoad, setCaptureOnLoadState] = useState(false);
  const [unavailable, setUnavailable] = useState('');
  const history = useRef<string[]>([]);
  const historyPos = useRef(-1);
  const cursor = useRef({ session: '', after: 0 });
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const toast = useToast();

  const add = useCallback((...next: Item[]) => {
    setItems((prev) => {
      const all = [...prev, ...next];
      return all.length > MAX_ITEMS ? all.slice(-MAX_ITEMS) : all;
    });
  }, []);

  // Pull new messages from the page. A new session id means the page reloaded.
  const poll = useCallback(async () => {
    try {
      let result = await readLogs(tabId, cursor.current.after);
      if (result.session !== cursor.current.session) {
        const reloaded = cursor.current.session !== '';
        cursor.current = { session: result.session, after: 0 };
        result = await readLogs(tabId, 0);
        if (reloaded) add({ kind: 'system', key: key(), time: Date.now(), text: 'Page reloaded' });
      }
      if (result.entries.length) {
        cursor.current.after = result.entries.at(-1)!.id;
        add(...result.entries.map((e) => ({ kind: 'log' as const, key: key(), time: e.time, level: e.level, text: e.text })));
      }
      setUnavailable('');
    } catch (e) {
      // Often just a navigation in progress; the next poll usually succeeds.
      setUnavailable(errorMessage(e));
    }
  }, [tabId, add]);

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

  useEffect(() => {
    getCaptureOnLoad(pageUrl).then(setCaptureOnLoadState, () => {});
  }, [pageUrl]);

  // Follow new output unless the user has scrolled up to read.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list && stickToBottom.current) list.scrollTop = list.scrollHeight;
  }, [items]);

  const run = async () => {
    const source = code.trim();
    if (!source || running) return;
    setRunning(true);
    setCode('');
    history.current = [...history.current.filter((h) => h !== source), source].slice(-50);
    historyPos.current = -1;
    stickToBottom.current = true;
    add({ kind: 'input', key: key(), time: Date.now(), text: source });
    try {
      const result = await runCode(tabId, source);
      // Messages the code logged come before its result, as in DevTools.
      await poll();
      add({
        kind: 'result',
        key: key(),
        time: Date.now(),
        ok: result.ok,
        text: result.blocked
          ? `This site blocks running typed code (Content Security Policy). Its console messages are still shown.\n${result.text}`
          : result.text,
      });
    } catch (e) {
      add({ kind: 'result', key: key(), time: Date.now(), ok: false, text: errorMessage(e) });
    } finally {
      setRunning(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      run();
      return;
    }
    // Up/Down walk the history when the caret is on the first/last line.
    const el = e.currentTarget;
    const past = history.current;
    if (e.key === 'ArrowUp' && past.length && !el.value.slice(0, el.selectionStart).includes('\n')) {
      e.preventDefault();
      historyPos.current = historyPos.current < 0 ? past.length - 1 : Math.max(0, historyPos.current - 1);
      setCode(past[historyPos.current] ?? '');
    } else if (e.key === 'ArrowDown' && historyPos.current >= 0 && !el.value.slice(el.selectionEnd).includes('\n')) {
      e.preventDefault();
      historyPos.current += 1;
      if (historyPos.current >= past.length) {
        historyPos.current = -1;
        setCode('');
      } else {
        setCode(past[historyPos.current] ?? '');
      }
    }
  };

  const toggleCapture = async (on: boolean) => {
    try {
      await setCaptureOnLoad(pageUrl, on);
      setCaptureOnLoadState(on);
      toast(on ? 'Capturing from page load. Reload the page to start' : 'Capture from page load turned off');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const query = filter.toLowerCase();
  const visible = items.filter((item) => matchesLevel(item, level) && item.text.toLowerCase().includes(query));
  const logs = items.filter((i): i is Extract<Item, { kind: 'log' }> => i.kind === 'log');
  const counts = { error: logs.filter((l) => l.level === 'error').length, warn: logs.filter((l) => l.level === 'warn').length };

  const copyVisible = async () => {
    const text = visible
      .map((item) => {
        if (item.kind === 'log') return `${clock(item.time)} [${item.level}] ${item.text}`;
        if (item.kind === 'input') return `> ${item.text}`;
        if (item.kind === 'result') return `< ${item.text}`;
        return `-- ${item.text}`;
      })
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast(`Copied ${visible.length} line(s)`);
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-bg px-3 pt-2.5 pb-2">
        <div className="flex items-center gap-1.5">
          <div className="flex shrink-0 rounded-md border border-border bg-surface p-0.5">
            {LEVEL_FILTERS.map((f) => {
              const count = f.id === 'error' ? counts.error : f.id === 'warn' ? counts.warn : 0;
              return (
                <button
                  key={f.id}
                  onClick={() => setLevel(f.id)}
                  className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    level === f.id ? 'bg-accent-soft text-accent' : 'text-muted hover:text-fg'
                  }`}
                >
                  {f.label}
                  {count > 0 && (
                    <span
                      className={`rounded-full px-1 text-[10px] leading-4 ${
                        f.id === 'error' ? 'bg-danger text-white' : 'bg-amber-500 text-white'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter…"
              className="h-7 w-full rounded-md border border-border bg-surface pr-2 pl-8 text-xs text-fg placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
            />
          </div>
          <IconButton label="Copy shown lines" onClick={copyVisible} disabled={!visible.length}>
            <Copy />
          </IconButton>
          <IconButton label="Clear console" onClick={() => setItems([])}>
            <Trash2 />
          </IconButton>
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
          <Switch label="Capture from page load on this site" checked={captureOnLoad} onChange={toggleCapture} />
          <span className="truncate">Capture from page load</span>
          <Button className="ml-auto h-6 px-2" onClick={() => browser.tabs.reload(tabId)} title="Reload the page">
            <RotateCw />
            <span className="hidden @xs:inline">Reload page</span>
          </Button>
        </div>
      </div>

      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        className="min-h-0 flex-1 overflow-y-auto font-mono text-[11px] leading-4"
      >
        {unavailable && (
          <div className="border-b border-border px-3 py-1.5 text-faint">Can't read this page right now: {unavailable}</div>
        )}
        {visible.map((item) => {
          if (item.kind === 'system') {
            return (
              <div key={item.key} className="border-b border-border/60 px-3 py-1.5 font-sans text-[11px] text-faint italic">
                {item.text}
              </div>
            );
          }
          const tone =
            item.kind === 'log'
              ? levelRow[item.level]
              : item.kind === 'input'
                ? 'text-muted'
                : item.ok
                  ? 'text-fg'
                  : 'bg-danger-soft text-danger';
          return (
            <div key={item.key} className={`flex gap-2 border-b border-border/60 px-3 py-1 ${tone}`}>
              <span className="w-[52px] shrink-0 text-faint">
                {item.kind === 'log' ? clock(item.time) : item.kind === 'input' ? '›' : '‹'}
              </span>
              <span className="max-h-40 min-w-0 flex-1 cursor-text overflow-auto break-all whitespace-pre-wrap">
                {item.text}
              </span>
            </div>
          );
        })}
      </div>

      <form
        className="flex items-end gap-2 border-t border-border bg-surface px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <ChevronRight className="mb-1.5 size-3.5 shrink-0 text-accent" />
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={onKeyDown}
          rows={Math.min(6, code.split('\n').length)}
          placeholder="Run JavaScript on this page… (Enter to run, Shift+Enter for a new line)"
          spellCheck={false}
          className="min-w-0 flex-1 resize-none bg-transparent py-1 font-mono text-[11.5px] text-fg placeholder:font-sans placeholder:text-faint focus:outline-none"
        />
        <Button type="submit" variant="primary" disabled={!code.trim() || running}>
          <CornerDownLeft />
          Run
        </Button>
      </form>
    </div>
  );
}
