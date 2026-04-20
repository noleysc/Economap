import { writeFileSync } from 'fs';
import { isBlockedError } from './assert.js';
import { launchBrowser } from './browser.js';
import { loadConfig } from './config.js';
import { log } from './log.js';
import { asJson, printHumanReport, summarize } from './report.js';
import { withRetry } from './retry.js';
import { uploadResults } from './storage.js';
import { scrapeAmazon } from './stores/amazon.js';
import { scrapeKroger } from './stores/kroger.js';
import { scrapeMeijer } from './stores/meijer.js';
import { scrapeSams } from './stores/sams.js';
import { scrapeShoprite } from './stores/shoprite.js';
import { scrapeTarget } from './stores/target.js';
import { scrapeWalmart } from './stores/walmart.js';
import { scrapeWholeFoods } from './stores/wholefoods.js';
import type { Listing, RunReport, StoreId, StoreResult } from './types.js';
import type { Browser } from 'playwright';

const STORE_LABELS: Record<StoreId, string> = {
  walmart: 'Walmart',
  target: 'Target',
  sams: "Sam's Club",
  kroger: 'Kroger',
  wholefoods: 'Whole Foods',
  meijer: 'Meijer',
  amazon: 'Amazon Fresh',
  shoprite: 'ShopRite',
};

const SCRAPERS: Record<StoreId, (browser: Browser, item: string) => Promise<Listing | null>> = {
  walmart: scrapeWalmart,
  target: scrapeTarget,
  sams: scrapeSams,
  kroger: scrapeKroger,
  wholefoods: scrapeWholeFoods,
  meijer: scrapeMeijer,
  amazon: scrapeAmazon,
  shoprite: scrapeShoprite,
};

async function runStore(
  browser: Browser,
  store: StoreId,
  item: string,
  attempts: number
): Promise<StoreResult> {
  const startedAt = Date.now();
  const label = STORE_LABELS[store];
  log.info(`scraping ${label}`, { store, item });
  try {
    const { value, attempts: tries } = await withRetry(
      () => SCRAPERS[store](browser, item),
      { attempts, baseDelayMs: 1500, maxDelayMs: 8000, label: `${label}/${item}` }
    );
    const status: StoreResult['status'] = value && value.totalPrice > 0 ? 'ok' : 'no-results';
    return {
      store,
      storeLabel: label,
      status,
      attempts: tries,
      durationMs: Date.now() - startedAt,
      listing: value,
    };
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    return {
      store,
      storeLabel: label,
      status: isBlockedError(err) ? 'blocked' : 'error',
      attempts,
      durationMs: Date.now() - startedAt,
      error: msg,
      listing: null,
    };
  }
}

async function runOnce(item: string, stores: StoreId[], attempts: number, headless: boolean): Promise<RunReport> {
  const startedAt = new Date().toISOString();
  const browser = await launchBrowser(headless);
  const results: StoreResult[] = [];
  try {
    for (const store of stores) {
      const result = await runStore(browser, store, item, attempts);
      results.push(result);
      if (result.status === 'ok') {
        log.info(`${result.storeLabel}: ${result.listing!.name}`, {
          price: result.listing!.totalPrice,
          per_lb: result.listing!.pricePerLb,
        });
      } else {
        log.warn(`${result.storeLabel}: ${result.status}`, { error: result.error });
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }
  return { item, startedAt, finishedAt: new Date().toISOString(), results };
}

export async function main(): Promise<number> {
  const cfg = loadConfig();
  log.info('starting scraper', {
    items: cfg.items,
    stores: cfg.stores,
    headless: cfg.headless,
    attempts: cfg.attempts,
  });

  const reports: RunReport[] = [];
  for (const item of cfg.items) {
    const r = await runOnce(item, cfg.stores, cfg.attempts, cfg.headless);
    reports.push(r);
    if (!cfg.json) printHumanReport(r, cfg.compareLb);
  }

  if (cfg.json) {
    process.stdout.write(asJson(reports) + '\n');
  }

  if (cfg.outFile) {
    writeFileSync(cfg.outFile, asJson(reports));
    log.info(`wrote ${cfg.outFile}`);
  }

  if (!cfg.noUpload) {
    for (const r of reports) {
      const u = await uploadResults(r);
      if (u.skipped) log.info('upload skipped', { item: r.item, reason: u.reason });
      else log.info('upload ok', { item: r.item, rows: u.uploaded });
    }
  }

  const summary = summarize(reports);
  log.info('done', summary);
  return summary.collected > 0 ? 0 : 1;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    log.error('fatal', { error: (err as Error)?.message ?? String(err) });
    process.exit(2);
  });
