export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';
export type PageLogEntry = { id: number; level: LogLevel; time: number; text: string };
export type RunResult = { ok: boolean; blocked?: boolean; text: string };

// Installed in the page by entrypoints/console-hook.ts.
export type ConsoleHook = {
  // New for every document, so a reload can be told apart from more messages.
  session: string;
  read(after: number): PageLogEntry[];
  run(code: string): Promise<RunResult>;
};

declare global {
  interface Window {
    __siteDataEditorConsole?: ConsoleHook;
  }
}

const HOOK_FILE = '/console-hook.js';

async function inPage<Args extends unknown[], T>(tabId: number, func: (...args: Args) => T, args: Args) {
  const [injection] = await browser.scripting.executeScript({ target: { tabId }, world: 'MAIN', func, args });
  return injection?.result as Awaited<T>;
}

async function ensureHook(tabId: number) {
  const installed = await inPage(tabId, () => !!window.__siteDataEditorConsole, []);
  if (!installed) {
    await browser.scripting.executeScript({ target: { tabId }, world: 'MAIN', files: [HOOK_FILE] });
  }
}

// Messages logged after `after` (an entry id). Installs the hook first if the page doesn't have it.
export async function readLogs(tabId: number, after: number) {
  const read = (after: number) => {
    const hook = window.__siteDataEditorConsole;
    return hook ? { session: hook.session, entries: hook.read(after) } : null;
  };
  const result = await inPage(tabId, read, [after]);
  if (result) return result;
  await ensureHook(tabId);
  return (await inPage(tabId, read, [0]))!;
}

// Evaluates typed code in the page, like the DevTools console.
export async function runCode(tabId: number, code: string): Promise<RunResult> {
  await ensureHook(tabId);
  return inPage(tabId, (code: string) => window.__siteDataEditorConsole!.run(code), [code]);
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
