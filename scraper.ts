import { chromium, firefox, Browser } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { createClient } from '@supabase/supabase-js';

chromium.use(StealthPlugin());

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://vamphigqpyyxwbxtsbqd.supabase.co',
  process.env.SUPABASE_KEY || 'sb_publishable_MdeTcirXdYraVcGUVZZCTA_USeDvqzc'
);

const searchItem = (process.env.SEARCH_ITEM || 'banana').toLowerCase();
const isCloud = process.env.GITHUB_ACTIONS === 'true';

const STORES = { TARGET: { zip: '33912' }, WALMART: { id: '4770' }, SAMS: { id: '8130' } };
const mobileProfile = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15', viewport: { width: 390, height: 844 }, isMobile: true };

function parsePrice(raw: string): number {
  const clean = raw.replace(/[^\d.¢]/g, '');
  if (clean.includes('¢')) return parseFloat(clean.replace('¢', '')) / 100;
  const price = parseFloat(clean);
  // Boundary Test: Reject prices that are obviously wrong for a single unit
  if (searchItem === 'banana' && (price > 1.50 || price < 0.10)) return 0;
  return (price > 0 && price < 500) ? price : 0;
}

async function getBrowser(type: 'chromium' | 'firefox'): Promise<Browser> {
  const engine = type === 'chromium' ? chromium : firefox;
  return await engine.launch({ headless: isCloud });
}

async function scrapeSamsClub(): Promise<{ name: string; price: number }> {
  console.log("[Status] Hunting Sam's Club...");
  const url = `https://www.samsclub.com/s/${encodeURIComponent(searchItem)}?clubId=${STORES.SAMS.id}`;
  let browser = await getBrowser('chromium');
  try {
    const context = await browser.newContext(mobileProfile);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const cards = page.locator('[data-automation-id="product-card"]');
    for (let i = 0; i < Math.min(await cards.count(), 8); i++) {
        const name = await cards.nth(i).locator('[data-automation-id="product-title"]').innerText();
        const n = name.toLowerCase();
        // Ignore cereal/snacks, look for the bulk banana price (usually $1.30 - $2.00 at Sam's)
        if (n.includes(searchItem) && !n.includes('cereal') && !n.includes('loops')) {
            const rawPrice = await cards.nth(i).locator('[data-automation-id="product-price"]').innerText();
            const price = parseFloat(rawPrice.replace(/[^\d.]/g, ''));
            if (price > 1.00 && price < 5.00) return { name, price };
        }
    }
    return { name: "Not Found", price: 0 };
  } catch { return { name: "Not Found", price: 0 }; } finally { await browser.close(); }
}

async function scrapeWalmart(): Promise<{ name: string; price: number }> {
  console.log("[Status] Hunting Walmart...");
  const url = `https://www.walmart.com/search?q=${encodeURIComponent(searchItem)}&sort=price_low`;
  const browser = await getBrowser('chromium');
  try {
    const context = await browser.newContext(mobileProfile);
    await context.addCookies([{ name: 'vtc', value: STORES.WALMART.id, domain: '.walmart.com', path: '/' }]);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const cards = page.locator('[data-automation-id="product-card"], .mb1');
    for (let i = 0; i < Math.min(await cards.count(), 10); i++) {
        const name = (await cards.nth(i).locator('[data-automation-id="product-title"]').first().innerText()).toLowerCase();
        if (name.includes(searchItem) && !name.includes('cereal')) {
            const priceText = await cards.nth(i).locator('[data-automation-id="product-price"]').first().innerText();
            const price = parsePrice(priceText.split('\n')[0]);
            if (price > 0) return { name, price };
        }
    }
    return { name: 'Not Found', price: 0 };
  } catch { return { name: 'Not Found', price: 0 }; } finally { await browser.close(); }
}

async function runEconomap() {
  const [walmart, sams] = await Promise.all([scrapeWalmart(), scrapeSamsClub()]);
  const results = [];
  if (walmart.price > 0) results.push({ store: 'Walmart', name: walmart.name, price: walmart.price });
  if (sams.price > 0) results.push({ store: "Sam's Club", name: sams.name, price: sams.price });
  const report = results.map(res => {
    const isBulk = res.store === "Sam's Club";
    const multiplier = searchItem.includes('banana') ? (isBulk ? 1 : 7) : 1;
    const total = res.price * (isBulk ? 1 : multiplier);
    return { Store: res.store, Product: res.name.substring(0, 30), Unit: `$${res.price.toFixed(2)}`, Bulk: `$${total.toFixed(2)}`, _raw: total };
  }).sort((a, b) => a._raw - b._raw);
  console.table(report.map(({_raw, ...c}) => c));
  if (isCloud && report.length > 0) {
    await supabase.from('price_history').insert(report.map(r => ({ item_name: searchItem, store_name: r.Store, unit_price: parseFloat(r.Unit.replace('$', '')), bulk_matched_price: parseFloat(r.Bulk.replace('$', '')) })));
  }
}
runEconomap().then(() => console.log('[Complete]'));
