import type { Browser } from 'playwright';
import { newPage } from '../browser.js';
import { exists, firstAttr, firstText } from '../dom.js';
import { parsePrice } from '../price.js';
import { normalizeListing, parseQuantity, pickCheapest } from '../quantity.js';
import type { Listing } from '../types.js';

const CARD_SELECTOR = '[data-test="@web/site-top-of-funnel/ProductCardWrapper"]';
const NAME_BLOCKLIST = ['yogurt', 'candy'];

export async function scrapeTarget(browser: Browser, item: string): Promise<Listing | null> {
  const page = await newPage(browser);
  try {
    await page.goto(
      `https://www.target.com/s?searchTerm=${encodeURIComponent(item)}`,
      { waitUntil: 'domcontentloaded', timeout: 45000 }
    );
    await page.waitForSelector(CARD_SELECTOR, { timeout: 25000 });

    const cards = page.locator(CARD_SELECTOR);
    const count = await cards.count();

    const listings: Listing[] = [];
    for (let i = 0; i < Math.min(count, 25); i++) {
      const card = cards.nth(i);
      if (await exists(card.locator('[data-test="sponsored-text"]'))) continue;

      const name = await firstText(card.locator('[data-test="@web/ProductCard/title"]'));
      if (!name) continue;
      const lower = name.toLowerCase();
      if (!lower.includes(item)) continue;
      if (NAME_BLOCKLIST.some((b) => lower.includes(b))) continue;

      const priceText = await firstText(card.locator('[data-test="current-price"]'));
      if (!priceText) continue;
      const totalPrice = parsePrice(priceText);
      if (totalPrice <= 0) continue;

      const unitPriceText = (await firstText(card.locator('[data-test="unit-price"]'))) ?? '';
      const href = await firstAttr(card.locator('a[href*="/p/"]'), 'href');

      listings.push(
        normalizeListing(
          {
            name,
            totalPrice,
            qty: parseQuantity(name, item),
            unitPriceText,
            pricePerLb: null,
            pricePerEach: null,
            url: href ? new URL(href, 'https://www.target.com').toString() : undefined,
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
