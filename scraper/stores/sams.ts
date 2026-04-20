import type { Browser } from 'playwright';
import { assertNotBlocked } from '../assert.js';
import { newPage } from '../browser.js';
import { firstText } from '../dom.js';
import { parsePrice } from '../price.js';
import { normalizeListing, parseQuantity, pickCheapest } from '../quantity.js';
import type { Listing } from '../types.js';

export const SAMS_CLUB_ID = '8130';
const CARD_SELECTOR =
  '[data-testid^="product-card"], .sc-pc-card, [data-automation-id="product-card"]';
const TITLE_SELECTOR =
  '[data-automation-id="product-title"], .sc-pc-title-link, [data-testid="product-title"]';
const PRICE_SELECTOR =
  '[data-automation-id="product-price"], .sc-pc-price-full, [data-testid="product-price"]';
const UNIT_SELECTOR =
  '[data-automation-id="unit-price"], [data-testid="unit-price"]';
const NAME_BLOCKLIST = ['smoothie', 'protein'];

export async function scrapeSams(browser: Browser, item: string): Promise<Listing | null> {
  const page = await newPage(browser);
  try {
    await page
      .goto('https://www.samsclub.com/', { waitUntil: 'domcontentloaded', timeout: 30000 })
      .catch(() => {});
    await page.waitForTimeout(1500);

    await page.goto(
      `https://www.samsclub.com/s/${encodeURIComponent(item)}?clubId=${SAMS_CLUB_ID}`,
      { waitUntil: 'domcontentloaded', timeout: 45000 }
    );

    const title = await page.title();
    assertNotBlocked(!/robot|verify/i.test(title), 'sams-bot-wall: anti-bot interstitial served');

    try {
      await page.waitForSelector(CARD_SELECTOR, { timeout: 15000 });
    } catch {
      return null;
    }

    const cards = page.locator(CARD_SELECTOR);
    const count = await cards.count();
    const listings: Listing[] = [];
    for (let i = 0; i < Math.min(count, 25); i++) {
      const card = cards.nth(i);
      if ((await card.locator('text=Sponsored').count()) > 0) continue;

      const name = await firstText(card.locator(TITLE_SELECTOR));
      if (!name) continue;
      const lower = name.toLowerCase();
      if (!lower.includes(item)) continue;
      if (NAME_BLOCKLIST.some((b) => lower.includes(b))) continue;

      const priceText = await firstText(card.locator(PRICE_SELECTOR));
      if (!priceText) continue;
      const totalPrice = parsePrice(priceText);
      if (totalPrice <= 0) continue;

      const unitPriceText = (await firstText(card.locator(UNIT_SELECTOR))) ?? '';

      listings.push(
        normalizeListing(
          {
            name,
            totalPrice,
            qty: parseQuantity(name, item),
            unitPriceText,
            pricePerLb: null,
            pricePerEach: null,
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
