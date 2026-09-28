# Edge Add-ons store listing

Copy these into Microsoft Partner Center when submitting.

## Package
- Upload: `.output/extension-1.0.0-edge.zip` (run `npm run zip:edge`)

## Availability
- Visibility: Public (or Hidden to share only by link)
- Markets: All markets

## Properties
- Category: **Developer tools**
- Privacy policy URL: https://epicvishal.github.io/Extension/privacy.html
- Website URL: https://epicvishal.github.io/Extension/
- Support contact: https://github.com/epicvishal/Extension/issues
- Mature content: No

## Store listing (English)

### Name
Site Data Editor

### Short description
View, edit, copy and delete cookies, local/session storage and request headers, and use a console, for any website.

### Description
Site Data Editor is a simple developer tool for inspecting and changing the data websites keep in your browser. Click the toolbar icon on any page to see its cookies, local storage and session storage, and change them in place.

Cookies
• See every cookie the current page uses, including HttpOnly cookies and cookies set on parent domains
• Add, edit and delete cookies: value, domain, path, expiry, Secure, HttpOnly and SameSite
• Colour-coded tags for HttpOnly, Secure and Session cookies
• Expand a row to read the full value and details

Local and session storage
• Browse all keys and values of the current page
• Add, edit, rename and delete items; JSON values are tagged

Custom request headers
• Add headers such as Authorization or X-Tenant-Id for a domain
• Turn each header on or off with a switch; rules are remembered

Console
• See the page's console messages (log, info, warning, error) and uncaught errors, with level filters and search
• Run JavaScript on the page and see the result, with Up/Down history
• Optionally capture messages from page load on a site you choose

Everywhere
• Open it as a side panel that stays open while you switch tabs and follows the tab you are on
• Search by name, value or domain
• Tick rows to copy or delete many at once; Copy all exports the list as JSON
• One-click copy of any single value
• Light and dark mode

Privacy: Site Data Editor sends nothing anywhere. It makes no network requests of its own and has no analytics. Everything stays in your browser.

### Search terms
cookie editor, cookies, local storage, session storage, request headers, developer tools, web developer

### Images
- Store logo (300×300): `store/logo-300.png`
- Screenshots (1280×800): `store/screenshots/1-cookies.png` … `6-side-panel.png`

## Permission justifications
Use these if Partner Center or the reviewers ask why each permission is needed.

| Permission | Why it is needed |
|---|---|
| `cookies` | To list, add, edit and delete the cookies of the website the user is viewing, which is the main feature. |
| `scripting` | To read and write the page's localStorage and sessionStorage, and for the Console tab. Web storage and the page's console are only reachable from inside the page, so a small script runs in the active tab when the user opens those tabs. For the Console's optional "Capture from page load" switch, the extension registers that same packaged script for the one site the user turned it on for; turning the switch off removes it. |
| `declarativeNetRequest` | To add the custom request headers the user defines for a domain (Headers tab). No requests are blocked or redirected. |
| `storage` | To remember the user's custom header rules between browser sessions. |
| `sidePanel` | To let the user open the same editor in the browser's side panel, which stays open while switching tabs. |
| Host access to all sites (`<all_urls>`) | The tool is meant to work on whatever website the user opens. Cookie and header access requires host permission for that site. The extension acts only while the user has it open (popup or side panel), or for header rules the user explicitly created. |

Remote code: none. All code ships in the package. The Console tab evaluates JavaScript that the user types themselves, in the page, like the browser's DevTools console; nothing is downloaded or run without the user typing it.
Data collection: none.

## Notes for certification
Site Data Editor is a developer tool and does not require an account.

How to test:
1. Open any website, for example https://example.com or https://github.com.
2. Click the Site Data Editor toolbar icon.
3. Cookies tab: click Add, enter a name and value, and Save. The cookie appears in the list. Click the arrow next to its name to expand the full value; use Copy, Edit and Delete on the row.
4. Local storage tab: Add an item (e.g. key "test", value "123"), reload the page and reopen the popup; the item is still there.
5. Side panel: click the panel icon at the top right of the popup. The editor opens in the side panel; switch tabs and it shows the new tab's data. The icon at the top right of the panel closes it.
6. Console tab: messages the page logs appear in the list. Type `document.title` and press Enter; the page title is shown. Turn on "Capture from page load" and click Reload page to see messages from page load.
7. Headers tab: Add a header (e.g. "X-Test: hello") for the site's domain, reload the page, and check DevTools > Network > Request Headers: X-Test is sent.

The extension makes no network requests of its own and collects no data.
