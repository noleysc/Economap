import pkg from 'playwright-extra';
const { chromium, firefox } = pkg;
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());
const targetZip = process.argv[2] || '34287'; 

const stealthiPhone = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true
};

async function scrapeSamsClub(): Promise<number> {
  console.log("[Stealth] Pouncing on Sam's Club...");
  const sneakBrowser = await firefox.launch({ headless: false });
  const sneakPage = await (await sneakBrowser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) Gecko/20100101 Firefox/124.0'
  })).newPage();
  
  try {
    await sneakPage.goto('https://www.samsclub.com/ip/Bananas-3-lbs/13803520389', { waitUntil: 'domcontentloaded' });
    const sPriceEl = await sneakPage.waitForSelector('.sc-pc-price-full, [itemprop="price"], .visuallyhidden', { timeout: 15000 });
    const sText = await sPriceEl.innerText();
    return parseFloat(sText.match(/\d+\.\d{2}/)?.[0] || "1.47");
  } catch { 
    return 1.47; 
  } finally { 
    await sneakBrowser.close(); 
  }
}

async function runEconomap() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext(stealthiPhone);
  const page = await context.newPage();
  const results = [];

  try {
    // 1. TARGET
    console.log("[Stealth] Checking Target...");
    await page.goto('https://www.target.com/p/banana-each-good-38-gather-8482/-/A-15013944', { waitUntil: 'domcontentloaded' });
    const tPriceEl = page.locator('[data-test="current-price"] span, [data-test="product-price"]').first();
    await tPriceEl.waitFor({ state: 'visible', timeout: 15000 });
    results.push({ name: "Target", price: parseFloat((await tPriceEl.innerText()).replace(/[^0-9.]/g, '')) * 8 });

    // 2. WALMART
    console.log("[Stealth] Checking Walmart...");
    await page.goto('https://www.walmart.com/ip/Fresh-Banana-Each/44390948', { waitUntil: 'domcontentloaded' });
    const wPrice = await page.evaluate(() => {
      const json = JSON.parse(document.getElementById("__NEXT_DATA__")?.textContent || "{}");
      return json?.props?.pageProps?.initialData?.data?.product?.priceInfo?.currentPrice?.price || 0.27;
    });
    results.push({ name: "Walmart", price: wPrice * 8 });

    // 3. ALDI
    console.log("[Stealth] Pouncing on Aldi's Unit Price...");
    await page.goto('https://www.aldi.us/product/bananas-0000000000005731', { waitUntil: 'networkidle' });
    const aUnitEl = page.locator('.product-details__unit-of-measurement').first();
    await aUnitEl.waitFor({ state: 'visible', timeout: 15000 });
    const aRawText = await aUnitEl.innerText();
    const aUnitPrice = parseFloat(aRawText.match(/\$(\d+\.\d{2})\/lb/)?.[1] || "0.49");
    results.push({ name: "Aldi", price: aUnitPrice * 3 });

    // 4. SAM'S CLUB
    const sPrice = await scrapeSamsClub();
    if (sPrice > 0) results.push({ name: "Sam's Club", price: sPrice });

    // --- FINAL "MULTI-WINNER" COMPARISON MESSAGE ---
    const sorted = results.sort((a, b) => a.price - b.price);
    const minPrice = sorted[0].price;
    const winners = sorted.filter(item => item.price === minPrice);
    const loser = sorted[sorted.length - 1];
    const winnerNames = winners.map(w => w.name).join(" and ");
    const savings = (loser.price - minPrice).toFixed(2);

    console.log("\n--- Economap North Port Report ---");
    console.log(JSON.stringify(sorted));
    
    if (winners.length > 1) {
      console.log(`\nWinners: ${winnerNames} at $${minPrice.toFixed(2)}!`);
    } else {
      console.log(`\nWinner: ${winners[0].name} at $${minPrice.toFixed(2)}!`);
    }
    
    console.log(`This deal saves you $${savings} compared to ${loser.name}.`);
    console.log("----------------------------------\n");

  } catch (e: any) {
    console.error(`Bungle in North Port: ${e.message}`);
  } finally {
    await browser.close();
  }
}
runEconomap();
