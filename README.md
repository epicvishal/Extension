# Site Data Editor

Browser extension (Manifest V3) for Edge and Chrome. On any website, the popup lets you view, add, edit, select and delete:

- **Cookies** that the browser sends to the current page (including parent-domain cookies)
- **Local storage** and **session storage** items of the current page
- **Custom request headers** added to every request to a chosen domain (via declarativeNetRequest)
- **Network**: the page's failed fetch/XHR calls with the response, payload and headers (every call under All); copy as cURL
- **Console**: the page's console messages and uncaught errors, and a prompt that runs JavaScript on the page. `entrypoints/page-hook.ts` runs in the page (MAIN world) to record messages and API calls; the Console and Network tabs poll it once a second. "Capture from page load" registers the same script at `document_start` for one site

Selected cookies and storage items can be copied as JSON.

Clicking the toolbar icon opens a popup, which the browser closes as soon as focus leaves it. The panel button at the top right of the popup opens the same editor in the side panel instead, which stays open across tab switches and follows the active tab.

Built with WXT + React + TypeScript + Tailwind.

## Commands
- `npm run dev:edge` – launch Edge with the extension and hot reload (`npm run dev` for Chrome)
- `npm run build:edge` – production build in `.output/edge-mv3`
- `npm run zip:edge` – zip for upload to Microsoft Partner Center
- `npm run compile` – type-check

## Load manually
`edge://extensions` → Developer mode → Load unpacked → select `.output/edge-mv3`.

## Publishing (Edge Add-ons, free)
- Store text, permission reasons and reviewer notes: `store/listing.md`
- Logo (300×300): `store/logo-300.png`; screenshots (1280×800): `store/screenshots/`
- Icon source: `store/icon.svg`
- Privacy policy (GitHub Pages from `docs/`): https://epicvishal.github.io/Extension/privacy.html

## Layout
- `entrypoints/popup/`, `entrypoints/sidepanel/` – the two ways to open the editor; both render `components/App.tsx`
- `components/` – panels (cookies, storage, headers), forms and shared UI
- `utils/` – browser API wrappers: `cookies.ts`, `pageStorage.ts`, `headers.ts`, `tab.ts`
