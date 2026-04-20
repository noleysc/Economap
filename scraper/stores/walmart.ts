import type { Browser } from 'playwright';
import { assertNotBlocked } from '../assert.js';
import { newPage } from '../browser.js';
import { parsePrice } from '../price.js';
import { normalizeListing, parseQuantity, pickCheapest } from '../quantity.js';
import type { Listing } from '../types.js';

export const WALMART_STORE_ID = '4770';

const NAME_BLOCKLIST = ['ice cream', 'yogurt', 'candy'];

interface WalmartItem {
  name?: string;
  canonicalUrl?: string;
  sponsoredProduct?: boolean;
  isSponsored?: boolean;
  priceInfo?: {
    linePrice?: string;
    linePriceDisplay?: string;
    unitPrice?: string;
  };
}

export async function scrapeWalmart(browser: Browser, item: string): Promise<Listing | null> {
  const page = await newPage(browser, {
    cookies: [{ name: 'vtc', value: WALMART_STORE_ID, domain: '.walmart.com', path: '/' }],
  });
  try {
    await page.goto(
      `https://www.walmart.com/search?q=${encodeURIComponent(item)}&sort=price_low`,
      { waitUntil: 'domcontentloaded', timeout: 45000 }
    );

    const nextJson = await page.evaluate(
      () => document.getElementById('__NEXT_DATA__')?.textContent ?? null
    );
    assertNotBlocked(nextJson, 'walmart-bot-wall: __NEXT_DATA__ missing');

    const data = JSON.parse(nextJson) as {
      props?: {
        pageProps?: { initialData?: { searchResult?: { itemStacks?: { items?: WalmartItem[] }[] } } };
      };
    };
    const stacks = data.props?.pageProps?.initialData?.searchResult?.itemStacks ?? [];
    const items: WalmartItem[] = stacks.flatMap((s) => s.items ?? []);

    const listings: Listing[] = [];
    for (const it of items) {
      if (it.sponsoredProduct || it.isSponsored) continue;
      const name = it.name;
      const linePrice = it.priceInfo?.linePrice ?? it.priceInfo?.linePriceDisplay;
      if (!name || !linePrice) continue;

      const lower = name.toLowerCase();
      if (!lower.includes(item)) continue;
      if (NAME_BLOCKLIST.some((b) => lower.includes(b))) continue;

      const totalPrice = parsePrice(linePrice);
      if (totalPrice <= 0) continue;

      listings.push(
        normalizeListing(
          {
            name,
            totalPrice,
            qty: parseQuantity(name, item),
            unitPriceText: it.priceInfo?.unitPrice ?? '',
            pricePerLb: null,
            pricePerEach: null,
            url: it.canonicalUrl ? `https://www.walmart.com${it.canonicalUrl}` : undefined,
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
