import type { RunReport, StoreResult } from './types.js';

function fmtMoney(n: number | null | undefined, digits = 2): string {
  return n === null || n === undefined || !isFinite(n) ? '—' : `$${n.toFixed(digits)}`;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export function printHumanReport(report: RunReport, compareLb: number): void {
  const successful = report.results.filter((r) => r.status === 'ok' && r.listing);
  const sorted = [...successful].sort((a, b) => {
    const ax = a.listing!.pricePerLb ?? a.listing!.pricePerEach ?? a.listing!.totalPrice;
    const bx = b.listing!.pricePerLb ?? b.listing!.pricePerEach ?? b.listing!.totalPrice;
    return ax - bx;
  });

  console.log(`\n=== ${report.item} ===`);

  const statusRows = report.results.map((r) => ({
    Store: r.storeLabel,
    Status: r.status,
    Attempts: r.attempts,
    'Time (ms)': r.durationMs,
    Error: r.error ? truncate(r.error, 60) : '',
  }));
  console.table(statusRows);

  if (!sorted.length) {
    console.log('[Result] No prices collected.');
    return;
  }

  const productRows = sorted.map((r) => ({
    Store: r.storeLabel,
    Product: truncate(r.listing!.name, 42),
    Size: r.listing!.qty?.raw ?? '—',
    Total: fmtMoney(r.listing!.totalPrice),
    'Unit (store)': r.listing!.unitPriceText || '—',
    '$/lb': fmtMoney(r.listing!.pricePerLb),
    '$/ea': fmtMoney(r.listing!.pricePerEach),
  }));
  console.table(productRows);

  const cmp = sorted
    .filter((r) => r.listing!.pricePerLb !== null)
    .map((r) => ({
      Store: r.storeLabel,
      [`Cost for ${compareLb} lb`]: fmtMoney((r.listing!.pricePerLb as number) * compareLb),
    }));
  if (cmp.length >= 2) {
    console.log(`\n[Comparison] Cost to buy ${compareLb} lb of ${report.item}:`);
    console.table(cmp);
  }
}

export function summarize(reports: RunReport[]): { items: number; collected: number } {
  let collected = 0;
  for (const r of reports) {
    for (const sr of r.results) if (sr.status === 'ok' && sr.listing) collected++;
  }
  return { items: reports.length, collected };
}

export function asJson(reports: RunReport[]): string {
  return JSON.stringify(reports, null, 2);
}

export type { StoreResult };
