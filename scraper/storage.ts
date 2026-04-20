import { createClient } from '@supabase/supabase-js';
import { assert } from './assert.js';
import { log } from './log.js';
import { readSupabaseCreds } from './config.js';
import type { RunReport } from './types.js';

interface PriceRow {
  item_name: string;
  store_name: string;
  unit_price: number;
  size: string | null;
  price_per_lb: number | null;
  price_per_each: number | null;
}

export async function uploadResults(report: RunReport): Promise<{ uploaded: number; skipped: boolean; reason?: string }> {
  const creds = readSupabaseCreds();
  if (!creds) return { uploaded: 0, skipped: true, reason: 'missing SUPABASE_URL/SUPABASE_KEY' };

  const rows: PriceRow[] = [];
  for (const r of report.results) {
    if (r.status !== 'ok' || !r.listing || r.listing.totalPrice <= 0) continue;
    const row: PriceRow = {
      item_name: report.item,
      store_name: r.storeLabel,
      unit_price: r.listing.totalPrice,
      size: r.listing.qty?.raw ?? null,
      price_per_lb: r.listing.pricePerLb,
      price_per_each: r.listing.pricePerEach,
    };
    // Sanity-check what we're about to upsert; programmer error if these fail.
    assert(row.item_name && row.store_name, 'price row missing item_name/store_name');
    assert(row.unit_price > 0, `price row has non-positive unit_price (${row.unit_price})`);
    rows.push(row);
  }
  if (!rows.length) return { uploaded: 0, skipped: true, reason: 'no usable rows' };

  const supabase = createClient(creds.url, creds.key);
  const { error } = await supabase
    .from('price_history')
    .upsert(rows, { onConflict: 'item_name,store_name' });

  if (error) {
    log.error('supabase upload failed', { error: error.message });
    return { uploaded: 0, skipped: true, reason: error.message };
  }
  return { uploaded: rows.length, skipped: false };
}
