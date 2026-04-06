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

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';

const STORES = { 
  TARGET: { zip: '33912' }, 
  WALMART: { id: '4770' }, 
  SAMS: { id: '8130' } 
};

function parsePrice(raw: string): number {
  const clean = raw.toLowerCase().trim();
  if (clean.includes('¢')) {
    const match = clean.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) / 100 : 0;
  }
  const match = clean.match(/\$?(\d+\.\d{2})/);
  if (match) return parseFloat(match[1]);
  const fallback = parseFloat(clean.replace(/[^\d.]/g, ''));
  return (fallback > 0 && fallback < 100) ? fallback : 0;
}

async function getBrowser(): Promise<Browser> {
  // 2026 Tactic: Always use headed mode to bypass headless detection
  return await chromium.launch({ 
    headless: false, 
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'] 
  });
}

async function scrapeSamsClub(): Promise<{ name: string; price: number }> {
  console.log("[Status] Priming Sam's Club...");
  const browser = await getBrowser();
  try {
    const context = await browser.newContext({ userAgent: UA });
    const page = await context.newPage();
    await page.goto(`https://www.samsclub.com/s/${encodeURIComponent(searchItem)}?clubId=${STORES.SAMS.id}`, { waitUntil: 'networkidle' });
    await page.mouse.wheel(0, 1000); 
    const priceSelector = '[data-automation-id="product-price"], .sc-pc-price-full';
    await page.waitForSelector(priceSelector, { state: 'visible', timeout: 20000 });
    const name = await page.locator('[data-automation-id="product-title"]').first().innerText();
    const price = parsePrice(await page.locator(priceSelector).first().innerText());
    return { name, price };
  } catch { return { name: "Not Found", price: 0 }; } finally { await browser.close(); }
}

async function scrapeTarget(): Promise<{ name: string; price: number }> {
  console.log("[Status] Priming Target...");
  const browser = await getBrowser();
  try {
    const context = await browser.newContext({ userAgent: UA });
    const page = await context.newPage();
    await page.goto(`https://www.target.com/store-locator/find-stores/${STORES.TARGET.zip}`);
    const btn = page.locator('button:has-text("shop this store"), button:has-text("set as my store")').first();
    if (await btn.isVisible()) await btn.click();
    await page.waitForTimeout(2000);
    await page.goto(`https://www.target.com/s?searchTerm=${encodeURIComponent(searchItem + " fresh")}`);
    await page.waitForSelector('[data-test="current-price"]', { state: 'visible', timeout: 20000 });
    const name = await page.locator('a[data-test="product-title"]').first().innerText();
    const price = parsePrice(await page.locator('[data-test="current-price"]').first().innerText());
    return { name, price };
  } catch { return { name: 'Not Found', price: 0 }; } finally { await browser.close(); }
}

async function scrapeWalmart(): Promise<{ name: string; price: number }> {
  console.log("[Status] Priming Walmart...");
  const browser = await getBrowser();
  try {
    const context = await browser.newContext({ userAgent: UA });
    await context.addCookies([{ name: 'vtc', value: STORES.WALMART.id, domain: '.walmart.com', path: '/' }]);
    const page = await context.newPage();
    await page.goto(`https://www.walmart.com/search?q=${encodeURIComponent(searchItem + " fresh")}&sort=price_low`);
    await page.waitForSelector('[data-automation-id="product-price"]', { timeout: 20000 });
    const name = await page.locator('[data-automation-id="product-title"]').first().innerText();
    const price = parsePrice(await page.locator('[data-automation-id="product-price"]').first().innerText());
    return { name, price };
  } catch { return { name: 'Not Found', price: 0 }; } finally { await browser.close(); }
}

async function runEconomap() {
  const [walmart, sams, target] = await Promise.all([scrapeWalmart(), scrapeSamsClub(), scrapeTarget()]);
  const results = [];
  if (walmart.price > 0) results.push({ store: 'Walmart', name: walmart.name, price: walmart.price });
  if (sams.price > 0) results.push({ store: "Sam's Club", name: sams.name, price: sams.price });
  if (target.price > 0) results.push({ store: "Target", name: target.name, price: target.price });
  
  const report = results.map(res => {
    const isBulk = res.store === "Sam's Club";
    const total = isBulk ? res.price : (res.price * 7);
    return { Store: res.store, Product: res.name.substring(0, 30), Unit: `$${res.price.toFixed(2)}`, Bulk: `$${total.toFixed(2)}`, _raw: total };
  }).sort((a, b) => a._raw - b._raw);
  
  console.table(report.map(({_raw, ...c}) => c));
  if (isCloud && report.length > 0) {
    await supabase.from('price_history').upsert(report.map(r => ({ 
      item_name: searchItem, store_name: r.Store, unit_price: parseFloat(r.Unit.replace('$', '')), bulk_matched_price: parseFloat(r.Bulk.replace('$', '')) 
    })), { onConflict: 'item_name,store_name' });
  }
}
runEconomap().then(() => console.log('[Complete]'));
