export type StorageArea = 'localStorage' | 'sessionStorage';
export type StorageEntry = { key: string; value: string };

type PageResult<T> = { ok: true; data: T } | { ok: false; error: string };

// Runs `func` inside the page's top frame. The function is serialized, so it must not use outer variables.
async function runInPage<Args extends unknown[], T>(
  tabId: number,
  func: (...args: Args) => PageResult<T>,
  args: Args,
): Promise<T> {
  const [injection] = await browser.scripting.executeScript({ target: { tabId }, func, args });
  const result = injection?.result as PageResult<T> | undefined;
  if (!result) throw new Error('Could not run on this page');
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export function readStorage(tabId: number, area: StorageArea) {
  return runInPage(
    tabId,
    (area: StorageArea): PageResult<StorageEntry[]> => {
      try {
        const store = window[area];
        const entries: StorageEntry[] = [];
        for (let i = 0; i < store.length; i++) {
          const key = store.key(i)!;
          entries.push({ key, value: store.getItem(key) ?? '' });
        }
        entries.sort((a, b) => a.key.localeCompare(b.key));
        return { ok: true, data: entries };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
    [area],
  );
}

export function writeStorage(
  tabId: number,
  area: StorageArea,
  changes: { set?: StorageEntry[]; remove?: string[] },
) {
  return runInPage(
    tabId,
    (area: StorageArea, set: StorageEntry[], remove: string[]): PageResult<null> => {
      try {
        const store = window[area];
        remove.forEach((key) => store.removeItem(key));
        set.forEach(({ key, value }) => store.setItem(key, value));
        return { ok: true, data: null };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
    [area, changes.set ?? [], changes.remove ?? []],
  );
}
