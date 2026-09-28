import { useEffect, useRef, useState } from 'react';
import { getActiveTab, type ActiveTab } from './tab';

// Ask as soon as the script runs, not after React's first render.
const initial = getActiveTab().catch(() => null);

const samePage = (a: ActiveTab | null | undefined, b: ActiveTab | null) =>
  a === b || (!!a && !!b && a.id === b.id && a.url.href === b.url.href);

/**
 * The side panel stays open across tab switches, so follow whichever tab is active.
 * `revision` goes up each time the active page finishes loading, so panels can re-read it.
 * The page object only changes when the tab or its URL does, to avoid needless reloads.
 */
export function useActiveTab() {
  const [page, setPage] = useState<ActiveTab | null | undefined>(undefined);
  const [revision, setRevision] = useState(0);
  const pageRef = useRef<ActiveTab | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    const apply = (next: ActiveTab | null) => {
      if (!alive) return;
      const prev = pageRef.current;
      if (samePage(prev, next)) {
        if (prev && next && prev.favIconUrl !== next.favIconUrl) {
          pageRef.current = { ...prev, favIconUrl: next.favIconUrl };
          setPage(pageRef.current);
        }
        return;
      }
      pageRef.current = next;
      setPage(next);
    };
    const refresh = () => getActiveTab().then(apply, () => apply(null));

    initial.then(apply);

    const onActivated = () => refresh();
    const onUpdated = (tabId: number, change: { url?: string; status?: string; favIconUrl?: string }) => {
      if (!change.url && !change.favIconUrl && change.status !== 'complete') return;
      getActiveTab().then((next) => {
        // Updates from background tabs don't matter, unless the active tab was a browser page.
        if (next?.id !== tabId && pageRef.current?.id !== tabId) return;
        apply(next);
        if (change.status === 'complete' && next?.id === tabId) setRevision((r) => r + 1);
      }, () => apply(null));
    };

    browser.tabs.onActivated.addListener(onActivated);
    browser.tabs.onUpdated.addListener(onUpdated);
    return () => {
      alive = false;
      browser.tabs.onActivated.removeListener(onActivated);
      browser.tabs.onUpdated.removeListener(onUpdated);
    };
  }, []);

  return { page, revision };
}
