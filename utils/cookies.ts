import type { Browser } from 'wxt/browser';

export type Cookie = Browser.cookies.Cookie;
export type SameSite = Cookie['sameSite'];

export type CookieInput = {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: SameSite;
  hostOnly: boolean;
  // Seconds since epoch; undefined makes a session cookie.
  expirationDate?: number;
};

export const cookieKey = (c: Cookie) => `${c.storeId}|${c.domain}|${c.path}|${c.name}`;

function cookieUrl(c: { domain: string; path: string; secure: boolean }) {
  return `http${c.secure ? 's' : ''}://${c.domain.replace(/^\./, '')}${c.path}`;
}

// Cookies the browser would send to this page, including ones set on parent domains.
export async function listCookies(pageUrl: URL): Promise<Cookie[]> {
  const cookies = await browser.cookies.getAll({ url: pageUrl.href });
  return cookies.sort((a, b) => a.name.localeCompare(b.name));
}

export async function removeCookie(c: Cookie) {
  await browser.cookies.remove({ url: cookieUrl(c), name: c.name, storeId: c.storeId });
}

export async function saveCookie(input: CookieInput, original?: Cookie) {
  if (!input.name.trim()) throw new Error('Name is required');
  if (!input.domain.trim()) throw new Error('Domain is required');
  if (input.sameSite === 'no_restriction' && !input.secure) {
    throw new Error('SameSite "None" requires Secure');
  }

  // Name, domain, path or host-only changed: this is a different cookie, so drop the old one.
  if (
    original &&
    (original.name !== input.name ||
      original.domain !== input.domain ||
      original.path !== input.path ||
      original.hostOnly !== input.hostOnly)
  ) {
    await removeCookie(original);
  }

  const result = await browser.cookies.set({
    url: cookieUrl(input),
    name: input.name,
    value: input.value,
    path: input.path || '/',
    secure: input.secure,
    httpOnly: input.httpOnly,
    sameSite: input.sameSite,
    expirationDate: input.expirationDate,
    storeId: original?.storeId,
    // Omitting the domain is how the cookies API creates a host-only cookie.
    domain: input.hostOnly ? undefined : input.domain,
  });
  if (!result) throw new Error('The browser rejected this cookie');
}
