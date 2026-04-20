import { test, expect } from '@playwright/test';

const searchItem = 'banana';

// Smoke tests that ensure the live retailer pages still expose the markers
// the scraper depends on. These hit real sites and may flake when the
// retailers are degraded; they are intentionally tolerant.
test.describe('Economap scraper selectors', () => {
  test('Walmart exposes __NEXT_DATA__ with searchResult.itemStacks', async ({ page }) => {
    await page.goto(`https://www.walmart.com/search?q=${searchItem}`, {
      waitUntil: 'domcontentloaded',
    });
    const nextJson = await page.evaluate(
      () => document.getElementById('__NEXT_DATA__')?.textContent ?? null
    );
    test.skip(!nextJson, 'Walmart bot wall served, skipping selector check');
    const data = JSON.parse(nextJson!);
    const stacks = data?.props?.pageProps?.initialData?.searchResult?.itemStacks;
    expect(Array.isArray(stacks)).toBeTruthy();
    expect(stacks.length).toBeGreaterThan(0);
  });

  test('Target exposes ProductCardWrapper + current-price', async ({ page }) => {
    await page.goto(`https://www.target.com/s?searchTerm=${searchItem}`, {
      waitUntil: 'domcontentloaded',
    });
    const card = page
      .locator('[data-test="@web/site-top-of-funnel/ProductCardWrapper"]')
      .first();
    await expect(card).toBeAttached({ timeout: 25000 });
    await expect(card.locator('[data-test="current-price"]').first()).toBeAttached();
    await expect(card.locator('[data-test="@web/ProductCard/title"]').first()).toBeAttached();
  });

  test("Sam's Club either renders cards or serves an interstitial", async ({ page }) => {
    await page.goto(`https://www.samsclub.com/s/${searchItem}`, {
      waitUntil: 'domcontentloaded',
    });
    const title = await page.title();
    if (/robot|verify/i.test(title)) {
      test.info().annotations.push({ type: 'note', description: "Sam's bot-walled (expected in CI)" });
      return;
    }
    const card = page
      .locator('[data-testid^="product-card"], [data-automation-id="product-card"]')
      .first();
    await expect(card).toBeAttached({ timeout: 20000 });
  });
});
