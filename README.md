# Site Data Editor

Browser extension (Manifest V3) for Edge and Chrome. On any website, the popup lets you view, add, edit, select and delete:

- **Cookies** that the browser sends to the current page (including parent-domain cookies)
- **Local storage** and **session storage** items of the current page
- **Custom request headers** added to every request to a chosen domain (via declarativeNetRequest)

Selected cookies and storage items can be copied as JSON.

Built with WXT + React + TypeScript + Tailwind.

## Commands
- `npm run dev:edge` – launch Edge with the extension and hot reload (`npm run dev` for Chrome)
- `npm run build:edge` – production build in `.output/edge-mv3`
- `npm run zip:edge` – zip for upload to Microsoft Partner Center
- `npm run compile` – type-check

## Load manually
`edge://extensions` → Developer mode → Load unpacked → select `.output/edge-mv3`.

## Layout
- `entrypoints/popup/` – popup shell and tabs
- `components/` – panels (cookies, storage, headers), forms and shared UI
- `utils/` – browser API wrappers: `cookies.ts`, `pageStorage.ts`, `headers.ts`, `tab.ts`
