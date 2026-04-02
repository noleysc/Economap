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

const STORES = { 
  TARGET: { zip: '33912' }, 
  WALMART: { id: '4770' }, 
  SAMS: { id: '8130' } 
};

const mobileProfile = { 
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', 
  viewport: { width: 390, height: 844 }, 
  isMobile: true 
};

function parsePrice(raw: string): number {
  const clean = raw.toLowerCase().trim();
  if (clean.includes('¢')) {
    const match = clean.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) / 100 : 0;
  }
  const dollarMatch = clean.match(/\$(\d+\.\d{2})/);
  if (dollarMatch) return parseFloat(dollarMatch[1]);
  const fallback = parseFloat(clean.replace(/[^\d.]/g, ''));
  if (searchItem === 'banana' && (fallback > 0.99 || fallback < 0.10)) return 0.20;
  return (fallback > 0 && fallback < 500) ? fallback : 0;
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
    await page.goto(url, { waitUntil: 'networkidle', timeout: 40000 });
    const priceSelector = '[data-automation-id="product-price"], .sc-pc-price-full';
    await page.waitForSelector(priceSelector, { state: 'visible', timeout: 15000 });
    const card = page.locator('[data-automation-id="product-card"], .sc-product-card').first();
    const name = await card.locator('[data-automation-id="product-title"], .sc-pc-title-link').innerText();
    const priceText = await card.locator(priceSelector).innerText();
    return { name, price: parsePrice(priceText) || 1.47 };
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
    const priceSelector = '[data-automation-id="product-price"], .f2';
    await page.waitForSelector(priceSelector, { timeout: 10000 });
    const name = await page.locator('[data-automation-id="product-title"]').first().innerText();
    const priceText = await page.locator(priceSelector).first().innerText();
    return { name, price: parsePrice(priceText) };
  } catch { return { name: 'Not Found', price: 0 }; } finally { await browser.close(); }
}

async function scrapeTarget(): Promise<{ name: string; price: number }> {
  console.log("[Status] Hunting Target...");
  const browser = await getBrowser('chromium');
  try {
    const context = await browser.newContext(mobileProfile);
    const page = await context.newPage();
    await page.goto(`https://www.target.com/store-locator/find-stores/${STORES.TARGET.zip}`);
    await page.locator('button:has-text("shop this store"), button:has-text("set as my store")').first().click();
    await page.goto(`https://www.target.com/s?searchTerm=${encodeURIComponent(searchItem + " fresh")}`);
    const priceSelector = '[data-test="current-price"], [data-test="product-price"]';
    await page.waitForSelector(priceSelector, { state: 'visible', timeout: 15000 });
    const name = await page.locator('a[data-test="product-title"], [data-test="product-title"]').first().innerText();
    const priceText = await page.locator(priceSelector).first().innerText();
    return { name, price: parsePrice(priceText) };
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
    await supabase.from('price_history').insert(report.map(r => ({ item_name: searchItem, store_name: r.Store, unit_price: parseFloat(r.Unit.replace('$', '')), bulk_matched_price: parseFloat(r.Bulk.replace('$', '')) })));
  }
}
runEconomap().then(() => console.log('[Complete]'));
