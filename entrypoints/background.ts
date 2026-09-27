export default defineBackground(() => {
  console.log('Background started', { id: browser.runtime.id });
});
