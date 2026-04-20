import type { Browser } from 'playwright';
import { newPage } from '../browser.js';
import { firstAttr, firstText } from '../dom.js';
import { parsePrice } from '../price.js';
import { normalizeListing, parseQuantity, pickCheapest } from '../quantity.js';
import type { Listing } from '../types.js';

// Meijer uses BEM-style classes from their Ads design system; the names are
// stable across deploys.
const CARD_SELECTOR = '.product-tile__top-content';
const NAME_BLOCKLIST = ['candy', 'soda'];

export async function scrapeMeijer(browser: Browser, item: string): Promise<Listing | null> {
  const page = await newPage(browser);
  try {
    await page.goto(
      `https://www.meijer.com/shopping/search.html?text=${encodeURIComponent(item)}`,
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

      const name = await firstText(card.locator('.product-tile__title h2'));
      if (!name) continue;
      const lower = name.toLowerCase();
      if (!lower.includes(item)) continue;
      if (NAME_BLOCKLIST.some((b) => lower.includes(b))) continue;

      const priceText = await firstText(card.locator('.product-tile__regular-price-text'));
      if (!priceText) continue;
      const totalPrice = parsePrice(priceText);
      if (totalPrice <= 0) continue;

      // productDescription is e.g. "$0.55 / lb | Approx. 0.5 lb" — give the
      // whole string to the size parser so it picks up the weight.
      const desc = (await firstText(card.locator('[data-testid="productDescription"]'))) ?? '';
      const units = (await firstText(card.locator('.product-tile__units'))) ?? '';
      const sizeText = `${name} ${desc} ${units}`;

      const href = await firstAttr(card.locator('a[href]'), 'href');

      listings.push(
        normalizeListing(
          {
            name,
            totalPrice,
            qty: parseQuantity(sizeText, item),
            unitPriceText: desc,
            pricePerLb: null,
            pricePerEach: null,
            url: href ? new URL(href, 'https://www.meijer.com').toString() : undefined,
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
