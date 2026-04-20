import type { Browser } from 'playwright';
import { assertNotBlocked } from '../assert.js';
import { newPage } from '../browser.js';
import { exists, firstAttr, firstText } from '../dom.js';
import { parsePrice } from '../price.js';
import { normalizeListing, parseQuantity, pickCheapest } from '../quantity.js';
import type { Listing } from '../types.js';

// `i=fresh` scopes the search to Amazon Fresh; this dramatically improves
// the quality of grocery hits over the default Amazon marketplace.
const CARD_SELECTOR = '[data-component-type="s-search-result"]';
const NAME_BLOCKLIST = ['t-shirt', 'sticker', 'phone case', 'plush', 'costume', 'puzzle'];

export async function scrapeAmazon(browser: Browser, item: string): Promise<Listing | null> {
  const page = await newPage(browser);
  try {
    await page.goto(
      `https://www.amazon.com/s?k=${encodeURIComponent(item)}&i=fresh`,
      { waitUntil: 'domcontentloaded', timeout: 45000 }
    );

    // Amazon's bot wall renders a "Robot Check" / "Sorry, we just need to make sure"
    // page; bail out early so the retry loop treats it as fatal.
    const title = await page.title();
    assertNotBlocked(
      !/robot check|just need to make sure/i.test(title),
      'amazon-bot-wall: anti-bot interstitial served'
    );

    try {
      await page.waitForSelector(CARD_SELECTOR, { timeout: 25000 });
    } catch {
      return null;
    }

    const cards = page.locator(CARD_SELECTOR);
    const count = await cards.count();

    const listings: Listing[] = [];
    for (let i = 0; i < Math.min(count, 30); i++) {
      const card = cards.nth(i);

      // Skip sponsored / Editorial picks.
      if (await exists(card.locator('.puis-sponsored-label-text, .s-sponsored-label-text'))) {
        continue;
      }

      const name = await firstText(card.locator('h2 span'));
      if (!name) continue;
      const lower = name.toLowerCase();
      if (!lower.includes(item)) continue;
      if (NAME_BLOCKLIST.some((b) => lower.includes(b))) continue;

      // `.a-offscreen` reliably contains the rendered price (e.g. "$0.99")
      // even when the visible markup is split into whole/fraction spans.
      const priceText = await firstText(card.locator('.a-price .a-offscreen'));
      if (!priceText) continue;
      const totalPrice = parsePrice(priceText);
      if (totalPrice <= 0) continue;

      // The per-unit price (when present) sits in a small grey "$X.XX/Count" tag.
      const unitPriceText =
        (await firstText(card.locator('.a-price.a-text-price[data-a-size="mini"] .a-offscreen'))) ??
        '';

      const asin = await firstAttr(card, 'data-asin');
      const url = asin ? `https://www.amazon.com/dp/${asin}` : undefined;

      listings.push(
        normalizeListing(
          {
            name,
            totalPrice,
            qty: parseQuantity(name, item),
            unitPriceText,
            pricePerLb: null,
            pricePerEach: null,
            url,
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
