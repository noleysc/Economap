import type { Browser } from 'playwright';
import { newPage } from '../browser.js';
import { exists, firstAttr, firstText } from '../dom.js';
import { parsePrice } from '../price.js';
import { normalizeListing, parseQuantity, pickCheapest } from '../quantity.js';
import type { Listing } from '../types.js';

const CARD_SELECTOR = '[data-testid^="product-card-"]';

// Kroger requires a selected store/division before any pricing renders.
// We seed a known-good Cincinnati/Ohio division so prices are available
// regardless of the runner's IP. Override with KROGER_DIVISION /
// KROGER_STORE_CODE env vars to target a different region.
const DEFAULT_DIVISION = '014';
const DEFAULT_STORE_CODE = '01400375';

export async function scrapeKroger(browser: Browser, item: string): Promise<Listing | null> {
  const division = process.env.KROGER_DIVISION || DEFAULT_DIVISION;
  const storeCode = process.env.KROGER_STORE_CODE || DEFAULT_STORE_CODE;

  const page = await newPage(browser, {
    cookies: [
      { name: 'DivisionID', value: division, domain: '.kroger.com', path: '/' },
      { name: 'StoreCode', value: storeCode, domain: '.kroger.com', path: '/' },
      { name: 'LocationCode', value: storeCode, domain: '.kroger.com', path: '/' },
    ],
  });
  try {
    await page.goto(
      `https://www.kroger.com/search?query=${encodeURIComponent(item)}&fulfillment=PICKUP`,
      { waitUntil: 'domcontentloaded', timeout: 45000 }
    );
    try {
      await page.waitForSelector(CARD_SELECTOR, { timeout: 25000 });
    } catch {
      return null;
    }

    const cards = page.locator(CARD_SELECTOR);
    const count = await cards.count();

    const listings: Listing[] = [];
    for (let i = 0; i < Math.min(count, 25); i++) {
      const card = cards.nth(i);
      if (await exists(card.locator('[data-testid="featured-product-tag"]'))) continue;

      const name = await firstText(card.locator('[data-testid="cart-page-item-description"]'));
      if (!name) continue;
      const lower = name.toLowerCase();
      if (!lower.includes(item)) continue;

      // Price element exposes the value via aria-label (e.g. "$9.99") and a
      // raw value attribute. Either is fine; fall back to the rendered text.
      const priceLoc = card.locator('[data-testid="product-item-unit-price"]');
      if (!(await exists(priceLoc))) continue;
      const aria = await firstAttr(priceLoc, 'aria-label');
      const valueAttr = await firstAttr(priceLoc, 'value');
      const totalPrice =
        (aria ? parsePrice(aria) : 0) ||
        (valueAttr ? parsePrice(`$${valueAttr}`) : 0) ||
        parsePrice((await firstText(priceLoc)) ?? '');
      if (totalPrice <= 0) continue;

      // Kroger renders two product-item-sizing nodes per card:
      // one is the per-unit price (e.g. "$0.59/oz"), the other the pack size ("17 oz").
      const sizingNodes = card.locator('[data-testid="product-item-sizing"]');
      const nSize = await sizingNodes.count();
      let unitPriceText = '';
      let sizeText = '';
      for (let j = 0; j < nSize; j++) {
        const txt = (await sizingNodes.nth(j).innerText()).trim();
        if (!txt) continue;
        if (/[$¢]/.test(txt) && /\/(oz|lb|each|ea|ct)/i.test(txt)) unitPriceText = txt;
        else if (!sizeText) sizeText = txt;
      }

      const href = await firstAttr(card.locator('a[href*="/p/"]'), 'href');

      listings.push(
        normalizeListing(
          {
            name,
            totalPrice,
            qty: parseQuantity(`${name} ${sizeText}`, item),
            unitPriceText,
            pricePerLb: null,
            pricePerEach: null,
            url: href ? new URL(href, 'https://www.kroger.com').toString() : undefined,
          },
          item
        )
      );
    }
    return pickCheapest(listings);
  } finally {
    await page.context().close().catch(() => {});
  }
}
