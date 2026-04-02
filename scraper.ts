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
const launchOptions = { headless: isCloud, slowMo: isCloud ? 0 : 50 };

const STORES = { WALMART: { id: '4770' }, SAMS: { id: '8130' } };
const mobileProfile = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15', viewport: { width: 390, height: 844 }, isMobile: true };

/**
 * DATA INTEGRITY: The "Banana Guard" Parser
 * Handles "20¢/ea" formats and prevents string concatenation errors.
 */
function parsePrice(raw: string): number {
  let clean = raw.toLowerCase().trim();
  
  // Handle "cents" notation (e.g., 20¢ or 19.2¢)
  if (clean.includes('¢')) {
    const cents = parseFloat(clean.replace(/[^\d.]/g, ''));
    return cents / 100;
  }

  // Handle standard dollar notation, ensuring we only take the first price seen
  // This prevents "$0.20 20.2¢" from becoming 0.20202
  const match = clean.match(/\d+\.\d{2}/);
  const price = match ? parseFloat(match[0]) : parseFloat(clean.replace(/[^\d.]/g, ''));

  // FINAL SAFETY BOUNDS: Reject data that defies common sense for the unit
  if (searchItem === 'banana' && (price > 1.50 || price < 0.10)) return 0;
  return (price > 0 && price < 500) ? price : 0;
}

async function getBrowser(type: 'chromium' | 'firefox'): Promise<Browser> {
  const engine = type === 'chromium' ? chromium : firefox;
  return await engine.launch(launchOptions);
}

async function scrapeSamsClub(): Promise<{ name: string; price: number }> {
  console.log("[Status] Hunting Sam's Club...");
  const url = `https://www.samsclub.com/s/${encodeURIComponent(searchItem)}?clubId=${STORES.SAMS.id}`;
  let browser = await getBrowser('chromium');
  try {
    const context = await browser.newContext(mobileProfile);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const card = page.locator('[data-automation-id="product-card"]').first();
    const name = await card.locator('[data-automation-id="product-title"]').innerText();
    const price = parsePrice(await card.locator('[data-automation-id="product-price"]').innerText());
    return { name, price };
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
    const name = await page.locator('[data-automation-id="product-title"]').first().innerText();
    // Walmart often hides the real price in a nested span
    const priceText = await page.locator('[data-automation-id="product-price"]').first().innerText();
    return { name, price: parsePrice(priceText) };
  } catch { return { name: 'Not Found', price: 0 }; } finally { await browser.close(); }
}

async function runEconomap() {
  const [walmart, sams] = await Promise.all([scrapeWalmart(), scrapeSamsClub()]);
  const results = [];
  if (walmart.price > 0) results.push({ store: 'Walmart', name: walmart.name, price: walmart.price });
  if (sams.price > 0) results.push({ store: "Sam's Club", name: sams.name, price: sams.price });
  
  const report = results.map(res => {
    const isBulk = res.store === "Sam's Club";
    const total = isBulk ? res.price : (res.price * 7);
    return { 
      Store: res.store, 
      Product: res.name.substring(0, 30), 
      Unit: `$${res.price.toFixed(2)}`, 
      Bulk: `$${total.toFixed(2)}`, 
      _raw: total 
    };
  }).sort((a, b) => a._raw - b._raw);
  
  console.table(report.map(({_raw, ...c}) => c));
  if (isCloud && report.length > 0) {
    await supabase.from('price_history').insert(report.map(r => ({ 
      item_name: searchItem, 
      store_name: r.Store, 
      unit_price: parseFloat(r.Unit.replace('$', '')), 
      bulk_matched_price: parseFloat(r.Bulk.replace('$', '')) 
    })));
  }
}
runEconomap().then(() => console.log('[Complete]'));
