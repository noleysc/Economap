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

// --- DEBUG MODE: Launch Headed if local ---
const launchOptions = { headless: isCloud, slowMo: isCloud ? 0 : 50 };

const STORES = { TARGET: { zip: '33912' }, WALMART: { id: '4770' }, SAMS: { id: '8130' } };
const mobileProfile = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15', viewport: { width: 390, height: 844 }, isMobile: true };

async function getBrowser(type: 'chromium' | 'firefox'): Promise<Browser> {
  const engine = type === 'chromium' ? chromium : firefox;
  return await engine.launch(launchOptions);
}

async function scrapeSamsClub(): Promise<{ name: string; price: number }> {
  console.log("[Status] Hunting Sam's Club (Visual)...");
  const url = `https://www.samsclub.com/s/${encodeURIComponent(searchItem)}?clubId=${STORES.SAMS.id}`;
  let browser = await getBrowser('chromium');
  try {
    const context = await browser.newContext(mobileProfile);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!isCloud) await page.waitForTimeout(2000); // Wait so you can see it

    const cards = page.locator('[data-automation-id="product-card"]');
    for (let i = 0; i < Math.min(await cards.count(), 5); i++) {
        const name = await cards.nth(i).locator('[data-automation-id="product-title"]').innerText();
        if (name.toLowerCase().includes(searchItem)) {
            const priceRaw = await cards.nth(i).locator('[data-automation-id="product-price"]').innerText();
            const price = parseFloat(priceRaw.replace(/[^\d.]/g, ''));
            if (price > 0) return { name, price };
        }
    }
    return { name: "Not Found", price: 0 };
  } catch { return { name: "Not Found", price: 0 }; } finally { await browser.close(); }
}

async function scrapeWalmart(): Promise<{ name: string; price: number }> {
  console.log("[Status] Hunting Walmart (Visual)...");
  const url = `https://www.walmart.com/search?q=${encodeURIComponent(searchItem)}&sort=price_low`;
  const browser = await getBrowser('chromium');
  try {
    const context = await browser.newContext(mobileProfile);
    await context.addCookies([{ name: 'vtc', value: STORES.WALMART.id, domain: '.walmart.com', path: '/' }]);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    if (!isCloud) await page.waitForTimeout(2000);

    const cards = page.locator('[data-automation-id="product-title"]');
    for (let i = 0; i < Math.min(await cards.count(), 5); i++) {
        const name = await cards.nth(i).innerText();
        if (name.toLowerCase().includes(searchItem)) {
            const priceText = await page.locator('[data-automation-id="product-price"]').nth(i).innerText();
            const price = parseFloat(priceText.replace(/[^\d.]/g, ''));
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
    const total = res.price * (isBulk ? 1 : 7);
    return { Store: res.store, Product: res.name.substring(0, 30), Unit: `$${res.price.toFixed(2)}`, Bulk: `$${total.toFixed(2)}`, _raw: total };
  }).sort((a, b) => a._raw - b._raw);
  console.table(report.map(({_raw, ...c}) => c));
}
runEconomap().then(() => console.log('[Complete]'));
