// Runs inside matching web pages. Update `matches` to the sites the extension should work on.
export default defineContentScript({
  matches: ['https://example.com/*'],
  main() {
    console.log('Content script loaded');
  },
});
