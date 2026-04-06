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
  return await chromium.launch({ headless: false, args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'] });
}

async function scrapeWalmart(): Promise<{ name: string; price: number }> {
  console.log("[Status] Pouncing on Walmart (Precision)...");
  const browser = await getBrowser();
  try {
    const context = await browser.newContext({ userAgent: UA });
    await context.addCookies([{ name: 'vtc', value: STORES.WALMART.id, domain: '.walmart.com', path: '/' }]);
    const page = await context.newPage();
    await page.goto(`https://www.walmart.com/search?q=${encodeURIComponent(searchItem)}+produce&sort=price_low`);
    await page.waitForSelector('[data-automation-id="product-price"]', { timeout: 15000 });
    const name = await page.locator('[data-automation-id="product-title"]').first().innerText();
    const price = parsePrice(await page.locator('[data-automation-id="product-price"]').first().innerText());
    return { name, price };
  } catch { return { name: "Not Found", price: 0 }; } finally { await browser.close(); }
}

async function scrapeSamsClub(): Promise<{ name: string; price: number }> {
  console.log("[Status] Pouncing on Sam's Club (Precision)...");
  const browser = await getBrowser();
  try {
    const context = await browser.newContext({ userAgent: UA });
    const page = await context.newPage();
    await page.goto(`https://www.samsclub.com/s/${encodeURIComponent(searchItem)}?clubId=${STORES.SAMS.id}`, { waitUntil: 'networkidle' });
    const cards = page.locator('[data-automation-id="product-card"]');
    for (let i = 0; i < Math.min(await cards.count(), 5); i++) {
        const name = await cards.nth(i).locator('[data-automation-id="product-title"]').innerText();
        const n = name.toLowerCase();
        // PRECISE MATCHING: Ignore smoothies, supplements, and proteins
        if (n.includes(searchItem) && !n.includes('smoothie') && !n.includes('protein') && !n.includes('powder')) {
            const priceText = await cards.nth(i).locator('[data-automation-id="product-price"]').innerText();
            return { name, price: parsePrice(priceText) };
        }
    }
    return { name: "Not Found", price: 0 };
  } catch { return { name: "Not Found", price: 0 }; } finally { await browser.close(); }
}

async function scrapeTarget(): Promise<{ name: string; price: number }> {
  console.log("[Status] Pouncing on Target (Precision)...");
  const browser = await getBrowser();
  try {
    const context = await browser.newContext({ userAgent: UA });
    const page = await context.newPage();
    // Target tactic: Force a ZIP-specific search result
    await page.goto(`https://www.target.com/s?searchTerm=${encodeURIComponent(searchItem + " produce")}&category=0%7CAll%7Cmatchallany%7Cproduce`);
    const priceSelector = '[data-test="current-price"], [data-test="product-price"], .h-text-bs';
    await page.waitForSelector(priceSelector, { state: 'visible', timeout: 20000 });
    const name = await page.locator('a[data-test="product-title"], [data-test="product-title"]').first().innerText();
    const priceText = await page.locator(priceSelector).first().innerText();
    return { name, price: parsePrice(priceText) };
  } catch { return { name: "Not Found", price: 0 }; } finally { await browser.close(); }
}

async function runEconomap() {
  const finalResults = [];
  console.log("--- EconoMap Hunter: Sequential Precision Hunt ---");
  
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
