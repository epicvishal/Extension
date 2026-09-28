import type { LogLevel, NetworkEntry, PageLogEntry, RunResult } from '@/utils/pageHook';

// Runs in the page's own JavaScript world (MAIN), injected by the Console and Network tabs or, with
// "Capture from page load", registered at document_start. It records console calls, uncaught errors
// and the page's fetch/XHR calls in buffers the extension polls, and evaluates code typed into the
// Console tab.
export default defineUnlistedScript(() => {
  if (window.__siteDataEditorPage) return;

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

  // ---- Network: fetch and XMLHttpRequest ----

  const MAX_REQUESTS = 300;
  const MAX_BODY = 50_000;
  const requests: NetworkEntry[] = [];
  let lastRequestId = 0;
  let lastSeq = 0;

  const clip = (text: string) => (text.length > MAX_BODY ? `${text.slice(0, MAX_BODY)}\n… (truncated)` : text);
  const absolute = (url: string) => {
    try {
      return new URL(url, location.href).href;
    } catch {
      return url;
    }
  };

  const describeBody = (body: unknown): string | undefined => {
    if (body == null) return undefined;
    if (typeof body === 'string') return clip(body);
    if (body instanceof URLSearchParams) return clip(body.toString());
    if (body instanceof FormData) {
      const parts: string[] = [];
      body.forEach((value, key) => parts.push(`${key}=${typeof value === 'string' ? value : `[file ${value.name}]`}`));
      return clip(parts.join('\n'));
    }
    if (body instanceof Blob) return `[Blob ${body.type || 'binary'}, ${body.size} bytes]`;
    if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) return `[binary, ${body.byteLength} bytes]`;
    return `[${Object.prototype.toString.call(body).slice(8, -1)}]`;
  };

  const headerList = (headers: HeadersInit | undefined): [string, string][] => {
    try {
      return headers ? [...new Headers(headers)] : [];
    } catch {
      return [];
    }
  };

  const track = (type: NetworkEntry['type'], method: string, url: string) => {
    const entry: NetworkEntry = { id: ++lastRequestId, seq: ++lastSeq, type, method, url, start: Date.now(), done: false };
    requests.push(entry);
    if (requests.length > MAX_REQUESTS) requests.splice(0, requests.length - MAX_REQUESTS);
    return entry;
  };

  const finish = (entry: NetworkEntry, patch: Partial<NetworkEntry>) => {
    Object.assign(entry, patch, { done: true, duration: Date.now() - entry.start, seq: ++lastSeq });
  };

  const originalFetch = window.fetch;
  // A Proxy keeps fetch's name and toString, in case the page checks them.
  window.fetch = new Proxy(originalFetch, {
    apply(target, thisArg, args: Parameters<typeof fetch>) {
      const [input, init] = args;
      let entry: NetworkEntry | undefined;
      try {
        const url = input instanceof Request ? input.url : input instanceof URL ? input.href : String(input);
        const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
        entry = track('fetch', method, absolute(url));
      } catch {
        // Recording must never stop the request.
      }
      const result: Promise<Response> = Reflect.apply(target, thisArg, args);
      if (!entry) return result;
      const tracked = entry;
      result.then(
        async (response) => {
          const status = response.status;
          if (status >= 400) {
            // Read a copy so the page still gets the original body.
            let body: string | undefined;
            try {
              body = clip(await response.clone().text());
            } catch {
              body = '[response body not readable]';
            }
            finish(tracked, {
              status,
              statusText: response.statusText,
              responseHeaders: [...response.headers],
              responseBody: body,
              requestHeaders: headerList(init?.headers ?? (input instanceof Request ? input.headers : undefined)),
              requestBody: describeBody(init?.body),
            });
          } else {
            finish(tracked, { status, statusText: response.statusText });
          }
        },
        (error: unknown) => {
          finish(tracked, {
            failed: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
            requestHeaders: headerList(init?.headers ?? (input instanceof Request ? input.headers : undefined)),
            requestBody: describeBody(init?.body),
          });
        },
      );
      return result;
    },
  });

  const xhrMeta = new WeakMap<XMLHttpRequest, { method: string; url: string; headers: [string, string][] }>();
  const xhr = XMLHttpRequest.prototype;
  const originalOpen = xhr.open;
  const originalSend = xhr.send;
  const originalSetRequestHeader = xhr.setRequestHeader;

  xhr.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
    xhrMeta.set(this, { method: String(method).toUpperCase(), url: absolute(String(url)), headers: [] });
    return (originalOpen as (...a: unknown[]) => void).call(this, method, url, ...rest);
  } as typeof xhr.open;

  xhr.setRequestHeader = function (this: XMLHttpRequest, name: string, value: string) {
    xhrMeta.get(this)?.headers.push([name, value]);
    return originalSetRequestHeader.call(this, name, value);
  };

  xhr.send = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
    const meta = xhrMeta.get(this);
    if (meta) {
      const entry = track('xhr', meta.method, meta.url);
      let aborted = false;
      this.addEventListener('abort', () => (aborted = true));
      this.addEventListener('loadend', () => {
        const status = this.status;
        if (status === 0) {
          finish(entry, {
            failed: aborted ? 'Aborted' : 'Network error (no response: offline, CORS or blocked)',
            requestHeaders: meta.headers,
            requestBody: describeBody(body),
          });
        } else if (status >= 400) {
          let responseBody: string;
          try {
            responseBody =
              this.responseType === '' || this.responseType === 'text'
                ? clip(this.responseText)
                : this.responseType === 'json'
                  ? clip(JSON.stringify(this.response))
                  : `[${this.responseType} response]`;
          } catch {
            responseBody = '[response body not readable]';
          }
          const responseHeaders = this.getAllResponseHeaders()
            .trim()
            .split(/[\r\n]+/)
            .filter(Boolean)
            .map((line): [string, string] => {
              const i = line.indexOf(':');
              return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
            });
          finish(entry, {
            status,
            statusText: this.statusText,
            responseHeaders,
            responseBody,
            requestHeaders: meta.headers,
            requestBody: describeBody(body),
          });
        } else {
          finish(entry, { status, statusText: this.statusText });
        }
      });
    }
    return originalSend.call(this, body);
  };

  window.__siteDataEditorPage = {
    session: Math.random().toString(36).slice(2),
    readLogs: (after) => entries.filter((e) => e.id > after),
    // Copies, so later updates to an entry aren't mixed into an earlier read.
    readRequests: (afterSeq) => requests.filter((r) => r.seq > afterSeq).map((r) => ({ ...r })),
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
