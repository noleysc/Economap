import type { Browser } from 'playwright';
import { newPage } from '../browser.js';
import { firstAttr, firstText } from '../dom.js';
import { parsePrice } from '../price.js';
import { normalizeListing, parseQuantity, pickCheapest } from '../quantity.js';
import type { Listing } from '../types.js';

// ShopRite renders product cards as <article data-testid="ProductCardWrapper-..." class="ProductCard--<hash>">
// with styled-components generated class names. The component-name prefix (the part
// before the first `--`) is stable across deploys, so we pin selectors to it with
// `class^=` instead of relying on the hashed suffixes.
const CARD_SELECTOR = 'article[data-testid^="ProductCardWrapper-"]';

// `rsid/3000` is a public store-lookup storefront ID that is served without
// authentication; any zipcode-free visit lands on this rsid by default. Override
// via SHOPRITE_RSID if you want prices from a specific store.
const DEFAULT_RSID = '3000';

export async function scrapeShoprite(browser: Browser, item: string): Promise<Listing | null> {
  const rsid = process.env.SHOPRITE_RSID || DEFAULT_RSID;
  const page = await newPage(browser);
  try {
    await page.goto(
      `https://www.shoprite.com/sm/planning/rsid/${rsid}/results?q=${encodeURIComponent(item)}`,
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

      // The h3 embeds a hidden "Open Product Description" ARIA helper node
      // as a child; innerText therefore returns "Name\nOpen Product Description".
      // Strip that suffix for clean reporting and upserts.
      const rawName = await firstText(card.locator('h3[class^="ProductCardNameWrapper--"]'));
      if (!rawName) continue;
      const name = rawName.replace(/\s*Open Product Description\s*$/i, '').trim();
      if (!name) continue;
      const lower = name.toLowerCase();
      if (!lower.includes(item)) continue;

      const priceText = await firstText(card.locator('[class^="ProductPrice--"]'));
      if (!priceText) continue;
      const totalPrice = parsePrice(priceText);
      if (totalPrice <= 0) continue;

      const unitPriceText = (await firstText(card.locator('[class^="ProductUnitPrice--"]'))) ?? '';

      // The AQA brand/size blurb (e.g. "Yellow Banana, 1 ct, 4 oz") carries
      // the pack-size context the parser needs when the name alone is too
      // generic ("Fresh Yellow Banana").
      const aqa =
        (await firstText(card.locator('[data-testid="ProductCardAQABrand"]'))) ?? '';
      const aria = (await firstAttr(card, 'aria-labelledby')) ?? '';
      const sizeText = `${name} ${aqa} ${aria}`;

      const href = await firstAttr(card.locator('a[href*="/product/"]'), 'href');

      listings.push(
        normalizeListing(
          {
            name,
            totalPrice,
            qty: parseQuantity(sizeText, item),
            unitPriceText,
            pricePerLb: null,
            pricePerEach: null,
            url: href ? new URL(href, 'https://www.shoprite.com').toString() : undefined,
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
