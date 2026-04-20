import { assert } from './assert.js';
import type { StoreId } from './types.js';

export interface CliFlags {
  items: string[];
  json: boolean;
  compareLb: number;
  stores: StoreId[];
  headless: boolean;
  attempts: number;
  outFile: string | null;
  noUpload: boolean;
}

const ALL_STORES: StoreId[] = [
  'walmart',
  'target',
  'kroger',
  'wholefoods',
  'meijer',
  'amazon',
  'shoprite',
  'sams',
];

// Default basket when --item / SEARCH_ITEMS is not provided. Covers a cross-
// category staple mix so the scraper exercises most of the quantity
// normalization paths (weight-based, each-based, count-based).
const DEFAULT_ITEMS = [
  'banana',
  'milk',
  'eggs',
  'bread',
  'rice',
  'chicken breast',
  'ground beef',
  'apple',
  'onion',
  'potato',
];

function parseList(s: string | undefined): string[] {
  if (!s) return [];
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

/** Build effective config from process.argv + env. CLI flags override env. */
export function loadConfig(argv: string[] = process.argv.slice(2)): CliFlags {
  const args = new Map<string, string>();
  const positional: string[] = [];
  for (const raw of argv) {
    if (raw.startsWith('--')) {
      const eq = raw.indexOf('=');
      if (eq > 0) args.set(raw.slice(2, eq), raw.slice(eq + 1));
      else args.set(raw.slice(2), 'true');
    } else {
      positional.push(raw);
    }
  }

  const itemsArg = args.get('item') ?? args.get('items') ?? process.env.SEARCH_ITEMS ?? process.env.SEARCH_ITEM;
  const items = (parseList(itemsArg).length ? parseList(itemsArg) : DEFAULT_ITEMS).map((s) => s.toLowerCase());

  const storesArg = args.get('stores') ?? process.env.STORES;
  const requestedStores = parseList(storesArg).filter((s) => (ALL_STORES as string[]).includes(s)) as StoreId[];
  const stores: StoreId[] = requestedStores.length ? requestedStores : ALL_STORES;

  const json = args.has('json') || process.env.LOG_FORMAT === 'json' || process.env.OUTPUT_FORMAT === 'json';

  const compareLb = parseFloat(args.get('compare-lb') ?? process.env.COMPARE_LB ?? '5');
  assert(Number.isFinite(compareLb) && compareLb > 0, `--compare-lb must be > 0 (got ${compareLb})`);

  const headlessRaw = args.get('headless') ?? process.env.HEADLESS;
  const isCloud = process.env.GITHUB_ACTIONS === 'true';
  const headless = headlessRaw ? headlessRaw !== 'false' : isCloud;

  const attempts = parseInt(args.get('attempts') ?? process.env.ATTEMPTS ?? '2', 10);
  assert(Number.isInteger(attempts) && attempts >= 1, `--attempts must be >= 1 (got ${attempts})`);

  const outFile = args.get('out') ?? process.env.OUT_FILE ?? null;
  const noUpload = args.has('no-upload') || process.env.NO_UPLOAD === 'true';

  assert(items.length > 0, 'no items to scrape after parsing --item / SEARCH_ITEMS');
  assert(stores.length > 0, 'no stores selected after parsing --stores / STORES');

  return { items, stores, json, compareLb, headless, attempts, outFile, noUpload };
}

export function isCloud(): boolean {
  return process.env.GITHUB_ACTIONS === 'true';
}

export interface SupabaseCreds {
  url: string;
  key: string;
}

/** Returns Supabase credentials only if both are set via env. Never falls back to baked-in defaults. */
export function readSupabaseCreds(): SupabaseCreds | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}
