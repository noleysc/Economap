import { chromium } from 'playwright-extra';
import type { Browser, BrowserContext, Page } from 'playwright';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
let stealthApplied = false;
function ensureStealth(): void {
  if (stealthApplied) return;
  chromium.use(StealthPlugin());
  stealthApplied = true;
}

const DEFAULT_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';

export async function launchBrowser(headless: boolean): Promise<Browser> {
  ensureStealth();
  return chromium.launch({
    headless,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });
}

export interface NewContextOptions {
  cookies?: { name: string; value: string; domain: string; path: string }[];
  userAgent?: string;
}

export async function newContext(browser: Browser, opts: NewContextOptions = {}): Promise<BrowserContext> {
  const ctx = await browser.newContext({
    userAgent: opts.userAgent ?? DEFAULT_UA,
    viewport: { width: 1366, height: 800 },
    locale: 'en-US',
  });
  if (opts.cookies?.length) await ctx.addCookies(opts.cookies);
  return ctx;
}

export async function newPage(browser: Browser, opts?: NewContextOptions): Promise<Page> {
  const ctx = await newContext(browser, opts);
  return ctx.newPage();
}
