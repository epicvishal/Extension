import type { Browser } from 'wxt/browser';

export type HeaderRule = {
  id: number;
  domain: string;
  name: string;
  value: string;
  enabled: boolean;
};

// Stored rules are the source of truth (disabled ones included); enabled ones are mirrored into
// declarativeNetRequest dynamic rules, which the browser applies to every matching request.
export const headerRules = storage.defineItem<HeaderRule[]>('local:headerRules', { fallback: [] });

export const nextRuleId = (rules: HeaderRule[]) => Math.max(0, ...rules.map((r) => r.id)) + 1;

export async function saveHeaderRules(rules: HeaderRule[]) {
  if (rules.some((r) => !r.name.trim() || !r.domain.trim())) {
    throw new Error('Header name and domain are required');
  }
  const resourceTypes = Object.values(
    browser.declarativeNetRequest.ResourceType,
  ) as `${Browser.declarativeNetRequest.ResourceType}`[];
  const existing = await browser.declarativeNetRequest.getDynamicRules();

  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((r) => r.id),
    addRules: rules
      .filter((r) => r.enabled)
      .map((r) => ({
        id: r.id,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [{ header: r.name.trim(), operation: 'set', value: r.value }],
        },
        condition: { requestDomains: [r.domain.trim()], resourceTypes },
      })),
  });
  await headerRules.setValue(rules);
}
