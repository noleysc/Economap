import { chromium, Browser } from 'playwright-extra';
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

const STORES = { TARGET: { zip: '33912' }, WALMART: { id: '4770' }, SAMS: { id: '8130' } };

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
  return await chromium.launch({ 
    headless: false, 
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'] 
  });
}

async function scrapeWalmart(): Promise<{ name: string; price: number }> {
  console.log("[Status] Pouncing on Walmart...");
  const browser = await getBrowser();
  try {
    const context = await browser.newContext({ userAgent: UA });
    await context.addCookies([{ name: 'vtc', value: STORES.WALMART.id, domain: '.walmart.com', path: '/' }]);
    const page = await context.newPage();
    // Direct search with "produce" department filter
    await page.goto(`https://www.walmart.com/search?q=${encodeURIComponent(searchItem)}+produce&sort=price_low`, { waitUntil: 'domcontentloaded' });
    const priceSelector = '[data-automation-id="product-price"], .f2';
    await page.waitForSelector(priceSelector, { timeout: 15000 });
    const name = await page.locator('[data-automation-id="product-title"]').first().innerText();
    const price = parsePrice(await page.locator(priceSelector).first().innerText());
    return { name, price };
  } catch { return { name: "Not Found", price: 0 }; } finally { await browser.close(); }
}

async function scrapeSamsClub(): Promise<{ name: string; price: number }> {
  console.log("[Status] Pouncing on Sam's Club...");
  const browser = await getBrowser();
  try {
    const context = await browser.newContext({ userAgent: UA });
    const page = await context.newPage();
    await page.goto(`https://www.samsclub.com/s/${encodeURIComponent(searchItem)}+produce?clubId=${STORES.SAMS.id}`, { waitUntil: 'networkidle' });
    await page.mouse.wheel(0, 1000); 
    const priceSelector = '[data-automation-id="product-price"], .sc-pc-price-full';
    await page.waitForSelector(priceSelector, { state: 'visible', timeout: 15000 });
    const name = await page.locator('[data-automation-id="product-title"]').first().innerText();
    const price = parsePrice(await page.locator(priceSelector).first().innerText());
    return { name, price };
  } catch { return { name: "Not Found", price: 0 }; } finally { await browser.close(); }
}

async function scrapeTarget(): Promise<{ name: string; price: number }> {
  console.log("[Status] Pouncing on Target...");
  const browser = await getBrowser();
  try {
    const context = await browser.newContext({ userAgent: UA });
    const page = await context.newPage();
    // Target Direct Search
    await page.goto(`https://www.target.com/s?searchTerm=${encodeURIComponent(searchItem)}+produce`);
    const priceSelector = '[data-test="current-price"], [data-test="product-price"]';
    await page.waitForSelector(priceSelector, { state: 'visible', timeout: 15000 });
    const name = await page.locator('a[data-test="product-title"]').first().innerText();
    const price = parsePrice(await page.locator(priceSelector).first().innerText());
    return { name, price };
  } catch { return { name: "Not Found", price: 0 }; } finally { await browser.close(); }
}

async function runEconomap() {
  const finalResults = [];
  console.log("--- EconoMap Hunter: Starting Sequential Hunt ---");
  
  const walmart = await scrapeWalmart();
  if (walmart.price > 0) finalResults.push({ store: 'Walmart', ...walmart });

  const sams = await scrapeSamsClub();
  if (sams.price > 0) finalResults.push({ store: "Sam's Club", ...sams });

  const target = await scrapeTarget();
  if (target.price > 0) finalResults.push({ store: "Target", ...target });

  const report = finalResults.map(res => {
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
