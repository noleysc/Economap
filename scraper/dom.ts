import type { Locator } from 'playwright';

/**
 * Tiny Playwright helpers that collapse the very common
 *   `if ((await loc.count()) === 0) continue;`
 *   `const x = (await loc.first().innerText()).trim();`
 * pattern into a single `await firstText(loc)` call that returns null when no
 * element matches. Combined with the assertion utilities, store scrapers stay
 * focused on selectors and business logic instead of Playwright's null dance.
 */

export async function exists(loc: Locator): Promise<boolean> {
  return (await loc.count()) > 0;
}

export async function firstText(loc: Locator): Promise<string | null> {
  if ((await loc.count()) === 0) return null;
  const t = await loc.first().innerText();
  return t.trim();
}

export async function firstAttr(loc: Locator, attr: string): Promise<string | null> {
  if ((await loc.count()) === 0) return null;
  return loc.first().getAttribute(attr);
}
