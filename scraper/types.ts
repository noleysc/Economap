export type BaseUnit = 'lb' | 'each';

export interface Quantity {
  qty: number;
  unit: BaseUnit;
  raw: string;
}

export interface Listing {
  name: string;
  totalPrice: number;
  qty: Quantity | null;
  unitPriceText: string;
  pricePerLb: number | null;
  pricePerEach: number | null;
  url?: string;
}

export type StoreId =
  | 'walmart'
  | 'target'
  | 'sams'
  | 'kroger'
  | 'wholefoods'
  | 'meijer'
  | 'amazon'
  | 'shoprite';

export interface StoreResult {
  store: StoreId;
  storeLabel: string;
  status: 'ok' | 'no-results' | 'blocked' | 'error';
  durationMs: number;
  attempts: number;
  error?: string;
  listing: Listing | null;
}

export interface RunReport {
  item: string;
  startedAt: string;
  finishedAt: string;
  results: StoreResult[];
}
