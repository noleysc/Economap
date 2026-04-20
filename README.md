# Economap

Multi-retailer grocery price scraper that normalizes pack sizes across stores so you can compare on a true per-pound basis.

[![Watch the demo](https://img.youtube.com/vi/G9PU7EiYc_I/0.jpg)](https://youtu.be/G9PU7EiYc_I)

## What it does

Given a search term (e.g. `banana`, `rice`, `ground beef`), Economap concurrently checks several major retailers, picks the cheapest non‑sponsored result at each one, normalizes each result to a canonical `$/lb` (and `$/each` where applicable), and prints a comparison table — or emits structured JSON for downstream pipelines.

It is deliberately **defensive**: when a retailer serves a bot wall or its DOM shifts, that store reports `blocked` / `no-results` and the rest of the run continues. The exit code reflects whether *any* prices were collected.

## Stores supported

| Store         | ID           | Strategy                                                 | Reliability                                                  |
|---------------|--------------|----------------------------------------------------------|--------------------------------------------------------------|
| Walmart       | `walmart`    | Reads embedded `__NEXT_DATA__` JSON                      | High                                                         |
| Target        | `target`     | DOM scrape via `data-test` attributes                    | High                                                         |
| Whole Foods   | `wholefoods` | DOM scrape via Amazon CSA product tiles                  | High                                                         |
| Meijer        | `meijer`     | DOM scrape via BEM `product-tile__*` classes             | High                                                         |
| Amazon Fresh  | `amazon`     | DOM scrape of `s-search-result` cards (filters Sponsored)| High; serves a Robot-Check page on aggressive use            |
| ShopRite      | `shoprite`   | DOM scrape of `ProductCardWrapper` styled-components cards | High                                                       |
| Kroger        | `kroger`     | DOM scrape; needs a seeded division/store cookie         | Medium (location-dependent, occasionally rate-limited)       |
| Sam's Club    | `sams`       | DOM scrape with bot-wall detection                       | Low (often serves a CAPTCHA in headless cloud)               |

`blocked` and `no-results` are *expected* outcomes for the lower‑reliability stores; the orchestrator records them in the per-run status table and keeps going.

## Quick start

```bash
npm install
npx playwright install --with-deps chromium

# Default: search for "banana" across all stores, headless on CI / visible locally
npm run scrape

# A specific item
SEARCH_ITEM=rice npm run scrape

# Multi-item, two specific stores, headless
HEADLESS=true npm run scrape -- --item=banana,rice --stores=walmart,target

# JSON output to a file (no Supabase upload)
npm run scrape -- --item=apple --json --no-upload --out=results.json

# Run the unit-test suite
npm test
```

## CLI flags

All flags can also be supplied as env vars (CLI takes precedence).

| Flag                     | Env                                  | Default                | Description |
|--------------------------|--------------------------------------|------------------------|-------------|
| `--item=a,b,c`           | `SEARCH_ITEMS`, `SEARCH_ITEM`        | 10-item default basket | Comma-separated items to scrape (see `DEFAULT_ITEMS` in `scraper/config.ts`) |
| `--stores=walmart,...`   | `STORES`                             | all 8 stores           | Restrict to specific stores |
| `--compare-lb=N`         | `COMPARE_LB`                         | `5`                    | Pounds used in the cross-store comparison table |
| `--attempts=N`           | `ATTEMPTS`                           | `2`                    | Retries per store before giving up |
| `--headless=true|false`  | `HEADLESS`                           | `true` on CI, else `false` | Run Chromium headless |
| `--json`                 | `OUTPUT_FORMAT=json`                 | off                    | Emit JSON to stdout instead of human tables |
| `--out=path.json`        | `OUT_FILE`                           | none                   | Also write JSON results to a file |
| `--no-upload`            | `NO_UPLOAD=true`                     | off                    | Skip Supabase upload regardless of env |

Logging knobs:

| Var               | Values                       | Description                          |
|-------------------|------------------------------|--------------------------------------|
| `LOG_LEVEL`       | `debug`/`info`/`warn`/`error`| Filter log output (default `info`)   |
| `LOG_FORMAT`      | `json`                       | Emit one JSON log line per event     |

Store-specific overrides:

| Var                  | Default        | Description                                       |
|----------------------|----------------|---------------------------------------------------|
| `KROGER_DIVISION`    | `014`          | Kroger division ID used in cookies                |
| `KROGER_STORE_CODE`  | `01400375`     | Kroger store code seeded into the cookie jar      |
| `SHOPRITE_RSID`      | `3000`         | ShopRite store-lookup storefront ID               |

## Output

### Human (default)

For every item, three tables print:

1. **Status** — per-store result, attempts, and timing
2. **Listings** — the cheapest non-sponsored match per store with size, total, store-supplied unit price, $/lb, and $/each
3. **Comparison** — the cost to buy `--compare-lb` pounds at each store that returned a per-pound figure

### JSON (`--json` / `--out=...`)

```jsonc
[
  {
    "item": "banana",
    "startedAt": "2026-04-20T19:48:15.578Z",
    "finishedAt": "2026-04-20T19:48:57.278Z",
    "results": [
      {
        "store": "walmart",
        "storeLabel": "Walmart",
        "status": "ok",
        "attempts": 1,
        "durationMs": 2819,
        "listing": {
          "name": "Fresh Banana, Each",
          "totalPrice": 0.20,
          "qty": { "qty": 1, "unit": "each", "raw": "each" },
          "unitPriceText": "50.0 ¢/lb",
          "pricePerLb": 0.50,
          "pricePerEach": 0.20,
          "url": "https://www.walmart.com/ip/..."
        }
      }
      // ...one entry per requested store
    ]
  }
]
```

Exit codes:

| Code | Meaning                                       |
|------|-----------------------------------------------|
| `0`  | At least one store returned a usable price    |
| `1`  | All stores returned `no-results` / `blocked`  |
| `2`  | Unhandled error inside the orchestrator       |

## How quantity normalization works

Two regex‑based parsers turn whatever the store gave us into a canonical per-pound (`$/lb`) figure. The store's own unit-price string is preferred; otherwise we derive from total ÷ pack size:

- **Weight pack** (`5 lb`, `1.5 lbs`, `16 oz`, `12 ounces`) → divided into total price.
- **Pack count** (`12 ct`, `6 pack`) → produces `$/each`; converts to `$/lb` if the item is in `TYPICAL_WEIGHTS_LB` (e.g. `banana ≈ 0.4 lb`).
- **Bunch / bundle** → uses `TYPICAL_BUNCH_LB` (e.g. `banana bunch ≈ 3 lb`) when known, else treated as one piece.
- **Each / ea** → one piece; per-pound estimate uses the same item-weight table.
- **Store unit-price text** like `74.0 ¢/lb`, `$0.04/ounce`, `$1.99/each` is parsed directly to `$/lb` (with ounce-to-pound conversion).

The lookup tables (`TYPICAL_WEIGHTS_LB`, `TYPICAL_BUNCH_LB`) live in `scraper/quantity.ts` and are easy to extend.

## Architecture

```
scraper/
├── index.ts             # entrypoint: CLI, orchestration, exit codes
├── config.ts            # env + flag parsing; safe Supabase cred loader
├── log.ts               # leveled logger (text or JSON)
├── retry.ts             # exponential backoff with jitter
├── browser.ts           # stealth + chromium launch helpers
├── price.ts             # parsePrice
├── quantity.ts          # parseQuantity / parseUnitPriceText / normalizeListing / pickCheapest
├── report.ts            # human tables + JSON serialization
├── storage.ts           # Supabase upsert (gated on real env vars)
├── types.ts             # shared interfaces
├── assert.ts            # assert / nonNull / ScraperBlockedError + isBlockedError
├── dom.ts               # exists / firstText / firstAttr Playwright helpers
├── stores/
│   ├── walmart.ts       # __NEXT_DATA__ path
│   ├── target.ts        # data-test selectors
│   ├── kroger.ts        # cookie-seeded location + DOM
│   ├── wholefoods.ts    # CSA product tiles
│   ├── meijer.ts        # BEM product-tile classes
│   ├── amazon.ts        # Amazon Fresh search results (skips sponsored)
│   ├── shoprite.ts      # styled-components ProductCardWrapper articles
│   └── sams.ts          # bot-wall tolerant DOM scrape
└── __tests__/
    ├── assert.test.ts   # assertion / blocked-error helpers
    └── quantity.test.ts # node:test unit tests for parsing
```

## Adding a new store

1. Drop a `scraper/stores/<id>.ts` exporting `async function scrape<Name>(browser, item): Promise<Listing|null>` — return the cheapest non-sponsored match or `null`.
2. Add the id to `StoreId` in `scraper/types.ts`.
3. Wire it into `STORE_LABELS` and `SCRAPERS` in `scraper/index.ts`, and into `ALL_STORES` in `scraper/config.ts`.
4. Prefer extracting from a structured payload (`__NEXT_DATA__`, embedded JSON, store API) when possible — DOM selectors rot the fastest.
5. If the store needs a pinned location, set cookies in `newPage(browser, { cookies: [...] })`.

## Database (optional)

If `SUPABASE_URL` and `SUPABASE_KEY` are both set, results are upserted into a `price_history` table. The upload is silently skipped (with a logged reason) if either is missing or if `--no-upload` is passed.

Suggested schema:

```sql
create table price_history (
  item_name       text not null,
  store_name      text not null,
  unit_price      numeric not null,        -- total package price as displayed
  size            text,                    -- e.g. "5 lb", "32 oz", "each"
  price_per_lb    numeric,                 -- canonical $/lb when computable
  price_per_each  numeric,                 -- canonical $/each when applicable
  recorded_at     timestamptz default now(),
  primary key (item_name, store_name)
);
```

## Continuous integration

`.github/workflows/automated-scraper.yml` runs:

1. `npm ci && npm test` — unit tests gate the scrape job.
2. `npx playwright install --with-deps chromium` then `npm run scrape -- --out=results.json` with `LOG_FORMAT=json` and `HEADLESS=true`.
3. Uploads `results.json` as a build artifact for inspection.

The workflow supports `workflow_dispatch` inputs for `items` and `stores`, runs on a daily 12:00 UTC cron, and is gated by a `concurrency` group + 15 minute timeout.

## Development

```bash
npm install                  # install dependencies
npx playwright install chromium
npm test                     # run node:test suite
npm run scrape -- --json     # one-off run, JSON output
npm run type-check           # tsc --noEmit
```

Add a quantity-parsing case in `scraper/__tests__/quantity.test.ts` whenever you teach the parser a new unit format.

## Known limitations

- **Sam's Club** ships an Akamai bot wall in headless mode; expect `blocked`. A residential proxy or a real-browser session is needed to bypass it reliably.
- **Kroger** requires a seeded `DivisionID`/`StoreCode` cookie *and* an unblocked client; expect intermittent `no-results` from cloud IPs.
- **Amazon Fresh** intermittently serves a "Robot Check" interstitial; the scraper detects it and short-circuits via `ScraperBlockedError` rather than retrying.
- The store-name `includes(searchTerm)` filter is intentionally loose — it can occasionally pick adjacent items (e.g. a `banana` query picking up `Apple AirTag` once Apple-branded electronics enter Target's relevance set). Tighten by passing more specific search terms.
- Pack-size parsing is regex-based; it covers `lb / oz / ct / each / bunch` but won't understand exotic formats like `1 gal` or `750 ml` without extension.
