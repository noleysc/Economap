/**
 * Parse a free-form total-price string. Returns 0 when no price is found.
 * Examples: "$1.71", "$0.20/lb", "74¢", "1.71".
 */
export function parsePrice(raw: string | null | undefined): number {
  if (!raw) return 0;
  const clean = raw.toLowerCase().trim();
  if (clean.includes('¢')) {
    const m = clean.match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) / 100 : 0;
  }
  const m = clean.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  if (m) return parseFloat(m[1]);
  const fb = parseFloat(clean.replace(/[^\d.]/g, ''));
  return fb > 0 && fb < 10000 ? fb : 0;
}
