import type { Listing, Quantity } from './types.js';

/** Per-piece weights (lb) for produce sold "each" or by piece. */
export const TYPICAL_WEIGHTS_LB: Record<string, number> = {
  banana: 0.4,
  apple: 0.4,
  orange: 0.5,
  lemon: 0.25,
  lime: 0.15,
  avocado: 0.45,
  potato: 0.5,
  onion: 0.5,
  tomato: 0.4,
  pepper: 0.5,
  cucumber: 0.5,
  pear: 0.4,
  mango: 0.7,
  kiwi: 0.2,
  peach: 0.4,
};

/** Per-bunch weights (lb). */
export const TYPICAL_BUNCH_LB: Record<string, number> = {
  banana: 3,
  grape: 2,
  carrot: 1,
  asparagus: 1,
  kale: 0.7,
  spinach: 0.5,
  cilantro: 0.2,
  parsley: 0.2,
  celery: 1.5,
  broccoli: 1.5,
};

const OZ_PER_LB = 16;

/**
 * Extract a normalized package quantity from a free-form name (and optional
 * extra size text). Returns null if no usable size info is found.
 */
export function parseQuantity(text: string, item = ''): Quantity | null {
  if (!text) return null;
  const t = text.toLowerCase();
  const itemLower = item.toLowerCase();

  // Weight: "5 lb", "1.5 lbs", "2 pound"
  const lb = t.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pound|pounds)\b/);
  if (lb) return { qty: parseFloat(lb[1]), unit: 'lb', raw: `${lb[1]} lb` };

  // Weight: "16 oz", "12 ounce"
  const oz = t.match(/(\d+(?:\.\d+)?)\s*(?:oz|ounce|ounces)\b/);
  if (oz) {
    const ounces = parseFloat(oz[1]);
    return { qty: ounces / OZ_PER_LB, unit: 'lb', raw: `${oz[1]} oz` };
  }

  // Pieces: "12 ct", "6 count", "3 pack", "2 pk"
  const ct = t.match(/(\d+)\s*(?:ct|count|pack|pk)\b/);
  if (ct) return { qty: parseFloat(ct[1]), unit: 'each', raw: `${ct[1]} ct` };

  // Bunch / bundle
  if (/\bbunch\b|\bbundle\b/.test(t)) {
    const bw = TYPICAL_BUNCH_LB[itemLower];
    if (bw) return { qty: bw, unit: 'lb', raw: `bunch (~${bw} lb est.)` };
    return { qty: 1, unit: 'each', raw: 'bunch' };
  }

  // Single item ("each", "ea")
  if (/\beach\b|\bea\b/.test(t)) return { qty: 1, unit: 'each', raw: 'each' };

  return null;
}

/**
 * Parse a unit-price string the store displays (e.g. "74.0 ¢/lb",
 * "$0.15/oz", "($0.04/ounce)", "$1.99 / each") into a per-pound dollar
 * amount. Returns null if the string can't be expressed per-pound.
 */
export function parseUnitPriceText(raw: string, item = ''): number | null {
  if (!raw) return null;
  const t = raw.toLowerCase().replace(/\s+/g, ' ').trim();

  let amount: number | null = null;
  const cents = t.match(/(\d+(?:\.\d+)?)\s*¢/);
  const dollars = t.match(/\$\s*(\d+(?:\.\d+)?)/);
  if (cents) amount = parseFloat(cents[1]) / 100;
  else if (dollars) amount = parseFloat(dollars[1]);
  if (amount === null) return null;

  if (/\/\s*lb\b|per\s*lb\b|\/\s*pound\b|per\s*pound\b/.test(t)) return amount;
  if (/\/\s*oz\b|per\s*oz\b|\/\s*ounce\b|per\s*ounce\b/.test(t)) return amount * OZ_PER_LB;
  if (/\/\s*ea\b|\/\s*each\b|per\s*each\b|\/\s*ct\b|per\s*ct\b/.test(t)) {
    const w = TYPICAL_WEIGHTS_LB[item.toLowerCase()];
    return w ? amount / w : null;
  }
  return null;
}

/**
 * Compute pricePerLb / pricePerEach from whatever info is available.
 * Priority: explicit unit-price text > derived from total / qty.
 */
export function normalizeListing(l: Listing, item = ''): Listing {
  let perLb = parseUnitPriceText(l.unitPriceText, item);
  let perEach: number | null = null;

  if (l.qty && l.totalPrice > 0) {
    if (l.qty.unit === 'lb') {
      if (perLb === null) perLb = l.totalPrice / l.qty.qty;
      const w = TYPICAL_WEIGHTS_LB[item.toLowerCase()];
      if (w && perLb !== null) perEach = perLb * w;
    } else {
      perEach = l.totalPrice / l.qty.qty;
      const w = TYPICAL_WEIGHTS_LB[item.toLowerCase()];
      if (perLb === null && w) perLb = perEach / w;
    }
  }

  return { ...l, pricePerLb: perLb, pricePerEach: perEach };
}

/** Pick the cheapest listing using $/lb, then $/each, then total as tiebreakers. */
export function pickCheapest(listings: Listing[]): Listing | null {
  const scored = listings.filter((l) => l.totalPrice > 0);
  if (!scored.length) return null;
  scored.sort((a, b) => {
    const ax = a.pricePerLb ?? a.pricePerEach ?? Infinity;
    const bx = b.pricePerLb ?? b.pricePerEach ?? Infinity;
    if (ax !== bx) return ax - bx;
    return a.totalPrice - b.totalPrice;
  });
  return scored[0];
}
