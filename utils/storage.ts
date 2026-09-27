// Typed wrappers around browser.storage. Add new keys here.
export const clickCount = storage.defineItem<number>('local:clickCount', {
  fallback: 0,
});
