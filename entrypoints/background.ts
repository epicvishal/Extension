import { HOOK_FILE } from '@/utils/pageHook';

export default defineBackground(() => {
  // "Capture from page load" scripts registered before the page script was renamed still point at
  // the old file; move them over so they keep working.
  browser.scripting
    .getRegisteredContentScripts()
    .then((scripts) => {
      const stale = scripts.filter((s) => s.js?.some((file) => file.includes('console-hook')));
      if (stale.length) return browser.scripting.updateContentScripts(stale.map((s) => ({ id: s.id, js: [HOOK_FILE] })));
    })
    .catch(console.error);
});
