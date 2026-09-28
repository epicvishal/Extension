import type { LogLevel, PageLogEntry, RunResult } from '@/utils/pageConsole';

// Runs in the page's own JavaScript world (MAIN), injected by the Console tab or, with
// "Capture from page load", registered at document_start. It records console calls and uncaught
// errors in a buffer the extension polls, and evaluates code typed into the Console tab.
export default defineUnlistedScript(() => {
  if (window.__siteDataEditorConsole) return;

  const MAX_ENTRIES = 1000;
  const MAX_TEXT = 5000;
  const entries: PageLogEntry[] = [];
  let lastId = 0;

  // A readable one-line (or stack) preview of any value, roughly like DevTools.
  const format = (value: unknown, depth = 0, seen = new WeakSet<object>()): string => {
    if (typeof value === 'string') return depth ? JSON.stringify(value) : value;
    if (value === undefined) return 'undefined';
    if (value === null || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'bigint') return `${value}n`;
    if (typeof value === 'symbol') return value.toString();
    if (typeof value === 'function') return `ƒ ${value.name || 'anonymous'}()`;
    if (value instanceof Error) return value.stack || `${value.name}: ${value.message}`;
    if (value instanceof Element) {
      const id = value.id ? `#${value.id}` : '';
      const classes = value.classList.length ? `.${[...value.classList].join('.')}` : '';
      return `<${value.tagName.toLowerCase()}${id}${classes}>`;
    }
    if (typeof value !== 'object') return String(value);
    if (seen.has(value)) return '[Circular]';
    if (depth >= 3) return Array.isArray(value) ? `Array(${value.length})` : '{…}';
    seen.add(value);
    try {
      if (Array.isArray(value)) {
        const items = value.slice(0, 100).map((v) => format(v, depth + 1, seen));
        if (value.length > 100) items.push(`… ${value.length - 100} more`);
        return `[${items.join(', ')}]`;
      }
      if (value instanceof Map) {
        const items = [...value].slice(0, 100).map(([k, v]) => `${format(k, depth + 1, seen)} => ${format(v, depth + 1, seen)}`);
        return `Map(${value.size}) {${items.join(', ')}}`;
      }
      if (value instanceof Set) {
        const items = [...value].slice(0, 100).map((v) => format(v, depth + 1, seen));
        return `Set(${value.size}) {${items.join(', ')}}`;
      }
      const keys = Object.keys(value);
      const ctor = (value as { constructor?: { name?: string } }).constructor;
      const name = ctor && ctor !== Object && ctor.name ? `${ctor.name} ` : '';
      const props = keys
        .slice(0, 100)
        .map((k) => `${k}: ${format((value as Record<string, unknown>)[k], depth + 1, seen)}`);
      if (keys.length > 100) props.push('…');
      return `${name}{${props.join(', ')}}`;
    } catch {
      return '[Object]';
    } finally {
      seen.delete(value);
    }
  };

  // console.log('%s is %d', a, b) style substitutions; %c styling is dropped.
  const formatArgs = (args: unknown[]) => {
    const rest = [...args];
    let head = '';
    if (typeof rest[0] === 'string' && /%[sdifoOc]/.test(rest[0])) {
      head = (rest.shift() as string).replace(/%([sdifoOc])/g, (_, type: string) => {
        if (!rest.length) return `%${type}`;
        const arg = rest.shift();
        if (type === 'c') return '';
        if (type === 'd' || type === 'i') return String(parseInt(String(arg), 10));
        if (type === 'f') return String(parseFloat(String(arg)));
        return type === 's' ? String(arg) : format(arg, 1);
      });
    }
    const text = [head, ...rest.map((a) => format(a))].filter((part, i) => i > 0 || part !== '').join(' ');
    return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text;
  };

  const push = (level: LogLevel, args: unknown[]) => {
    entries.push({ id: ++lastId, level, time: Date.now(), text: formatArgs(args) });
    if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
  };

  for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    const original = console[level];
    console[level] = function (this: Console, ...args: unknown[]) {
      try {
        push(level, args);
      } catch {
        // Never break the page's own logging.
      }
      return original.apply(this, args);
    };
  }

  window.addEventListener('error', (event) => {
    push('error', [`Uncaught ${event.error ? format(event.error) : event.message}`]);
  });
  window.addEventListener('unhandledrejection', (event) => {
    push('error', [`Uncaught (in promise) ${format(event.reason)}`]);
  });

  window.__siteDataEditorConsole = {
    session: Math.random().toString(36).slice(2),
    read: (after) => entries.filter((e) => e.id > after),
    async run(code): Promise<RunResult> {
      try {
        // Indirect eval runs in the global scope, so `var x = 1` stays defined, as in DevTools.
        let result: unknown = (0, eval)(code);
        if (result && typeof (result as PromiseLike<unknown>).then === 'function') result = await result;
        return { ok: true, text: format(result, 1) };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        // Sites with a strict Content Security Policy (or Trusted Types) forbid eval.
        const blocked = e instanceof EvalError || /unsafe-eval|TrustedScript|Content Security Policy/i.test(message);
        return { ok: false, blocked, text: blocked ? message : format(e) };
      }
    },
  };
});
