export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';
export type PageLogEntry = { id: number; level: LogLevel; time: number; text: string };
export type RunResult = { ok: boolean; blocked?: boolean; text: string };

// One fetch/XHR call made by the page. Bodies and headers are kept only for failed calls.
export type NetworkEntry = {
  id: number;
  // Bumped whenever the entry changes (started → finished), so readers can ask for "changed since".
  seq: number;
  type: 'fetch' | 'xhr';
  method: string;
  url: string;
  start: number;
  duration?: number;
  status?: number;
  statusText?: string;
  // Set when there was no HTTP response at all (offline, CORS, blocked, aborted).
  failed?: string;
  done: boolean;
  requestHeaders?: [string, string][];
  requestBody?: string;
  responseHeaders?: [string, string][];
  responseBody?: string;
};

export const isNetworkError = (e: NetworkEntry) => e.done && (!!e.failed || (e.status ?? 0) >= 400);

// Installed in the page by entrypoints/page-hook.ts.
export type PageHook = {
  // New for every document, so a reload can be told apart from more entries.
  session: string;
  readLogs(after: number): PageLogEntry[];
  readRequests(afterSeq: number): NetworkEntry[];
  run(code: string): Promise<RunResult>;
};

declare global {
  interface Window {
    __siteDataEditorPage?: PageHook;
  }
}

export const HOOK_FILE = '/page-hook.js';

async function inPage<Args extends unknown[], T>(tabId: number, func: (...args: Args) => T, args: Args) {
  const [injection] = await browser.scripting.executeScript({ target: { tabId }, world: 'MAIN', func, args });
  return injection?.result as Awaited<T>;
}

async function ensureHook(tabId: number) {
  const installed = await inPage(tabId, () => !!window.__siteDataEditorPage, []);
  if (!installed) {
    await browser.scripting.executeScript({ target: { tabId }, world: 'MAIN', files: [HOOK_FILE] });
  }
}

// Reads from the page's hook, installing it first if the page doesn't have it yet.
async function readFromHook<T>(tabId: number, what: 'logs' | 'requests', after: number) {
  const read = (what: 'logs' | 'requests', after: number) => {
    const hook = window.__siteDataEditorPage;
    if (!hook) return null;
    return { session: hook.session, entries: what === 'logs' ? hook.readLogs(after) : hook.readRequests(after) };
  };
  const result = await inPage(tabId, read, [what, after]);
  if (result) return result as { session: string; entries: T[] };
  await ensureHook(tabId);
  return (await inPage(tabId, read, [what, 0])) as { session: string; entries: T[] };
}

// Console messages logged after `after` (an entry id).
export const readLogs = (tabId: number, after: number) => readFromHook<PageLogEntry>(tabId, 'logs', after);

// Requests started or finished after `afterSeq`.
export const readRequests = (tabId: number, afterSeq: number) =>
  readFromHook<NetworkEntry>(tabId, 'requests', afterSeq);

// Evaluates typed code in the page, like the DevTools console.
export async function runCode(tabId: number, code: string): Promise<RunResult> {
  await ensureHook(tabId);
  return inPage(tabId, (code: string) => window.__siteDataEditorPage!.run(code), [code]);
}

// "Capture from page load": a content script registered for one site that installs the hook at
// document_start, before the page's own scripts run. It survives browser restarts until turned off.
const captureScriptId = (url: URL) => `console-capture-${url.protocol.replace(':', '')}-${url.hostname}`;

export async function getCaptureOnLoad(url: URL) {
  const scripts = await browser.scripting.getRegisteredContentScripts({ ids: [captureScriptId(url)] });
  return scripts.length > 0;
}

export async function setCaptureOnLoad(url: URL, on: boolean) {
  const id = captureScriptId(url);
  if (!on) return browser.scripting.unregisterContentScripts({ ids: [id] });
  await browser.scripting.registerContentScripts([
    {
      id,
      // No port in match patterns; this covers every port on the host.
      matches: [`${url.protocol}//${url.hostname}/*`],
      js: [HOOK_FILE],
      runAt: 'document_start',
      world: 'MAIN',
      persistAcrossSessions: true,
    },
  ]);
}
