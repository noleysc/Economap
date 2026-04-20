import type { Browser } from 'playwright';
import { newPage } from '../browser.js';
import { firstAttr } from '../dom.js';
import { parsePrice } from '../price.js';
import { normalizeListing, parseQuantity, pickCheapest } from '../quantity.js';
import type { Listing } from '../types.js';

// Whole Foods is delivered via Amazon Fresh; product tiles are <a> elements
// tagged with the Amazon CSA tracking attribute.
const CARD_SELECTOR = 'a[data-csa-c-type="productTile"]';

export async function scrapeWholeFoods(browser: Browser, item: string): Promise<Listing | null> {
  const page = await newPage(browser);
  try {
    await page.goto(
      `https://www.wholefoodsmarket.com/search?text=${encodeURIComponent(item)}`,
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

      // Headings within the card carry both the product name and its price.
      const headings = card.locator('.bds--heading-5');
      const nh = await headings.count();
      if (nh < 2) continue;

      let name = '';
      let priceText = '';
      let unitPriceText = '';
      for (let j = 0; j < nh; j++) {
        const txt = (await headings.nth(j).innerText()).trim();
        if (!txt) continue;
        if (/\$\d/.test(txt) || /¢/.test(txt)) {
          if (/\/(lb|oz|each|ea)\b/i.test(txt)) unitPriceText = txt;
          if (!priceText) priceText = txt;
        } else if (!name) {
          name = txt;
        }
      }
      if (!name || !priceText) continue;

      const lower = name.toLowerCase();
      if (!lower.includes(item)) continue;

      const totalPrice = parsePrice(priceText);
      if (totalPrice <= 0) continue;

      const href = await firstAttr(card, 'href');

      listings.push(
        normalizeListing(
          {
            name,
            totalPrice,
            qty: parseQuantity(name, item),
            unitPriceText,
            pricePerLb: null,
            pricePerEach: null,
            url: href ? new URL(href, 'https://www.wholefoodsmarket.com').toString() : undefined,
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
