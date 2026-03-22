import { test, expect } from '@playwright/test';

const searchItem = 'banana';

test.describe('Economap Selector Verification', () => {

  test('Target selectors are active', async ({ page }) => {
    await page.goto(`https://www.target.com/s?searchTerm=${searchItem}+fresh+produce`, { waitUntil: 'commit' });
    
    // Clear any overlays
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2000);

    // Use the resilient "Text-Link" pounce
    const title = page.locator(`a:has-text("${searchItem}")`).first();
    const price = page.locator('[data-test="current-price"] span, [data-test="product-price"]').first();
    
    await expect(title).toBeAttached({ timeout: 15000 });
    await expect(price).toBeAttached();
    
    const titleText = await title.innerText();
    console.log(`[Verify] Target Title: ${titleText}`);
  });

  test('Walmart selectors are active', async ({ page }) => {
    await page.goto(`https://www.walmart.com/search?q=${searchItem}+fresh`);
    const title = page.locator('[data-automation-id="product-title"]').first();
    const price = page.locator('[data-automation-id="product-price"]').first();
    
    await expect(title).toBeVisible({ timeout: 15000 });
    await expect(price).toBeVisible();
    console.log(`[Verify] Walmart Title: ${await title.innerText()}`);
  });

  test("Sam's Club selectors are active", async ({ page }) => {
    await page.goto(`https://www.samsclub.com/s/${searchItem}+3lb`);
    await page.mouse.wheel(0, 500); // Wake lazy load
    const title = page.locator('[data-automation-id="product-title"], .sc-pc-title-link').first();
    const price = page.locator('[data-automation-id="product-price"], .sc-pc-price-full').first();
    
    await expect(title).toBeAttached({ timeout: 15000 });
    await expect(price).toBeAttached();
    console.log(`[Verify] Sam's Club Title: ${await title.innerText()}`);
  });

});