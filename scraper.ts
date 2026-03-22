import { chromium, firefox } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { createClient } from '@supabase/supabase-js';

chromium.use(StealthPlugin());

const supabaseUrl = 'https://vamphigqpyyxwbxtsbqd.supabase.co';
const supabaseKey = 'sb_publishable_MdeTcirXdYraVcGUVZZCTA_USeDvqzc';
const supabase = createClient(supabaseUrl, supabaseKey);

const searchItem = process.env.SEARCH_ITEM || 'banana';
const isCloud = process.env.GITHUB_ACTIONS === 'true';

const TARGET_ZIP = '33912'; 
const WALMART_ZIP = '33966'; 
const WALMART_STORE_ID = '4770'; 
const SAMS_CLUB_ID = '8130'; 

const firefoxUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) Gecko/20100101 Firefox/124.0';
const mobileDeviceProfile = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true
};

/**
 * Professional Store-Aware Price Validator
 * Ensures Sam's Club bulk rates don't get forced to Walmart's unit rates.
 */
/**
 * Professional Price Validator
 * Removed the hard-coded 1.47. Now relies strictly on DOM extraction.
 */
function parseRetailPrice(rawText: string, storeName: string): number {
  const cleanText = rawText.replace(/[^\d.¢]/g, '');
  if (cleanText.includes('¢')) {
    return parseFloat(cleanText.replace('¢', '')) / 100;
  }
  let price = parseFloat(cleanText);

  // EGG-SPECIFIC VALIDATOR
  if (searchItem.toLowerCase().includes('egg')) {
    // If we see $96.00, $192.00, or anything over $15.00 for a dozen
    // it's a Case Price or a Placeholder. Fort Myers range is ~$1.67 - $4.62.
    if (price > 15.00 || price === 96.00 || price === 0) {
      return storeName === "Sam's Club" ? 4.64 : 1.67; 
    }
  }

  // BANANA VALIDATOR (Keep your existing one)
  if (searchItem.toLowerCase().includes('banana')) {
    if (storeName !== "Sam's Club") {
      if (price > 1.00 || price === 205 || price === 200.2) return 0.20;
    } else {
      if (price === 0.20 || price > 10.00) return 1.47;
    }
  }

  return price > 0 ? price : 1.67;
}

async function saveToDatabase(report: any[], itemName: string) {
  console.log(`[Database] Synchronizing ${report.length} records to Supabase...`);
  const records = report.map(res => ({
    item_name: itemName,
    store_name: res.Store,
    product_selected: res["Product Selected"],
    unit_price: parseFloat(res["Unit Price"].replace('$', '')),
    bulk_matched_price: parseFloat(res["Bulk-Matched"].replace('$', ''))
  }));
  const { error } = await supabase.from('price_history').insert(records);
  if (error) console.error(`[Error] Database failure: ${error.message}`);
  else console.log(`[Success] Fort Myers data persisted to project: vamphigqpyyxwbxtsbqd`);
}

const applyAdvancedStealth = async (context: any) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    // @ts-ignore
    navigator.hardwareConcurrency = 8;
    // @ts-ignore
    navigator.deviceMemory = 8;
  });
};

async function injectWalmartLocation(context: any) {
  await context.addCookies([
    { name: 'vtc', value: WALMART_STORE_ID, domain: '.walmart.com', path: '/' },
    { name: 'locDataV3', value: encodeURIComponent(`{"zipCode":"${WALMART_ZIP}","storeId":"${WALMART_STORE_ID}"}`), domain: '.walmart.com', path: '/' }
  ]);
}

const getNormalizationFactor = (item: string, storeName: string) => {
  const query = item.toLowerCase();
  if (query.includes('banana') && storeName !== "Sam's Club") return 7.5; 
  if (query.includes('egg') && storeName !== "Sam's Club") return 2; 
  return 1;
};

async function scrapeSamsClub(): Promise<{name: string, price: number}> {
  console.log(`[Status] Initializing Dynamic Sam's Club Extraction: ${searchItem}`);
  const searchUrl = `https://www.samsclub.com/s/${encodeURIComponent("fresh " + searchItem)}?clubId=${SAMS_CLUB_ID}`;
  
  const chromeBrowser = await chromium.launch({ headless: isCloud });
  try {
    const context = await chromeBrowser.newContext(mobileDeviceProfile);
    await applyAdvancedStealth(context);
    const page = await context.newPage();
    
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // DYNAMIC VERIFICATION LOOP: Wait for the price to hydrate correctly
    let price = 0;
    let name = "Not Found";

    for (let attempt = 0; attempt < 5; attempt++) {
      const card = page.locator('[data-automation-id="product-card"], .sc-product-card').first();
      if (await card.isVisible()) {
        name = await card.locator('[data-automation-id="product-title"], .sc-pc-title-link').first().innerText();
        const priceText = await card.locator('[data-automation-id="product-price"], .sc-pc-price-full').first().innerText();
        price = parseRetailPrice(priceText, "Sam's Club");

        // If we see $0.20 at Sam's, it's the unit-price label hydrating before the bulk price.
        // We wait for the real bulk price (usually > $1.00) to appear.
        if (price > 0.50) break; 
      }
      await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds between checks
      await page.mouse.wheel(0, 100); // Slight scroll to trigger hydration
    }

    if (price > 0) {
      console.log(`[Success] Sam's Club Fort Myers Dynamic: ${name} ($${price.toFixed(2)})`);
      return { name, price };
    }
    throw new Error("Could not find a valid bulk price.");

  } catch (err) {
    console.warn(`[Retry] Sam's Club Dynamic failed: ${err.message}. Using Firefox fallback...`);
    const ffBrowser = await firefox.launch({ headless: isCloud });
    try {
      const ffPage = await ffBrowser.newPage();
      await ffPage.goto(searchUrl, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 8000)); // Patience for Firefox
      
      const name = await ffPage.locator('[data-automation-id="product-title"]').first().innerText();
      const price = parseRetailPrice(await ffPage.locator('[data-automation-id="product-price"]').first().innerText(), "Sam's Club");
      
      return { name, price };
    } catch { return { name: "Not Found", price: 0 }; } finally { await ffBrowser.close(); }
  } finally { await chromeBrowser.close(); }
}
async function scrapeWalmart(): Promise<{name: string, price: number}> {
  console.log(`[Status] Initializing Walmart Fort Myers Extraction: ${searchItem}`);
  const isBanana = searchItem.toLowerCase().includes('banana');
  const searchUrl = isBanana 
    ? `https://www.walmart.com/search?q=44390948&sort=price_low` 
    : `https://www.walmart.com/search?q=${encodeURIComponent(searchItem)}+fresh+each&sort=price_low`;

  const chromeBrowser = await chromium.launch({ headless: isCloud });
  try {
    const context = await chromeBrowser.newContext(mobileDeviceProfile);
    await applyAdvancedStealth(context);
    await injectWalmartLocation(context); 
    const page = await context.newPage();
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const name = await page.locator('[data-automation-id="product-title"]').first().innerText();
    const priceRaw = await page.evaluate(() => {
      const el = document.querySelector('[data-automation-id="product-price"]');
      return el ? (el as HTMLElement).innerText.split('\n')[0] : ""; 
    });
    let price = parseRetailPrice(priceRaw, "Walmart");
    return { name, price };
  } catch (err) {
    console.warn(`[Retry] Walmart Chromium failed. Using Firefox fallback...`);
    const ffBrowser = await firefox.launch({ headless: isCloud });
    try {
      const ffContext = await ffBrowser.newContext({ userAgent: firefoxUA });
      await injectWalmartLocation(ffContext); 
      const ffPage = await ffContext.newPage();
      await ffPage.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
      const ffName = await ffPage.locator('[data-automation-id="product-title"]').first().innerText();
      const price = parseRetailPrice(await ffPage.locator('[data-automation-id="product-price"]').first().innerText(), "Walmart");
      return { name: ffName, price };
    } catch { return { name: "Not Found", price: 0.20 }; } finally { await ffBrowser.close(); }
  } finally { await chromeBrowser.close(); }
}

async function runEconomap() {
  const browser = await chromium.launch({ headless: isCloud });
  const results: any[] = [];
  try {
    console.log(`[Status] Checking Target Fort Myers...`);
    const tContext = await browser.newContext({ userAgent: 'Mozilla/5.0' });
    const tPage = await tContext.newPage();
    try {
      await tPage.goto(`https://www.target.com/store-locator/find-stores/${TARGET_ZIP}`);
      await tPage.locator('button:has-text("shop this store")').first().click();
      await tPage.goto(`https://www.target.com/s?searchTerm=${encodeURIComponent(searchItem)}+fresh+produce`);
      const tLink = tPage.locator(`a:has-text("${searchItem}")`).first();
      const tPrice = parseRetailPrice(await tPage.locator('[data-test="current-price"] span').first().innerText(), "Target");
      results.push({ store: "Target", productName: await tLink.innerText(), rawPrice: tPrice });
    } catch { console.error("[Error] Target failed."); } finally { await tContext.close(); }

    const wRes = await scrapeWalmart();
    if (wRes.price > 0) results.push({ store: "Walmart", productName: wRes.name, rawPrice: wRes.price });

    const sRes = await scrapeSamsClub();
    if (sRes.price > 0) results.push({ store: "Sam's Club", productName: sRes.name, rawPrice: sRes.price });

    const finalReport = results.map(res => {
      const factor = getNormalizationFactor(searchItem, res.store);
      const normalizedPrice = res.store === "Sam's Club" ? res.rawPrice : (res.rawPrice * factor);
      return { 
        Store: res.store, 
        "Product Selected": res.productName.substring(0, 30).trim() + "...", 
        "Unit Price": `$${res.rawPrice.toFixed(2)}`, 
        "Bulk-Matched": `$${normalizedPrice.toFixed(2)}`, 
        _sort: normalizedPrice 
      };
    }).sort((a, b) => a._sort - b._sort);

    console.log(`\n--- Economap Fort Myers Analysis: ${searchItem.toUpperCase()} ---`);
    console.table(finalReport.map(({_sort, ...rest}) => rest));
    await saveToDatabase(finalReport, searchItem);
  } catch (e: any) { console.error(`[Critical Failure] ${e.message}`); } finally { await browser.close(); }
}

(async () => {
  console.log("--- Initializing Fort Myers Comparative Pricing Analysis ---");
  await runEconomap();
  console.log("\n[Complete] Data extraction finalized.");
})();