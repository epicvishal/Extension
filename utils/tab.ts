export type ActiveTab = { id: number; url: URL; favIconUrl?: string };

// Returns the active tab of this window when it is a normal web page; browser pages (edge://, chrome://) return null.
export async function getActiveTab(): Promise<ActiveTab | null> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null || !tab.url) return null;
  const url = new URL(tab.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  return { id: tab.id, url, favIconUrl: tab.favIconUrl };
}
