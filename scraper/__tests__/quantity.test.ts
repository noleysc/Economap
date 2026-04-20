import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { normalizeListing, parseQuantity, parseUnitPriceText, pickCheapest } from '../quantity.js';
import { parsePrice } from '../price.js';
import type { Listing } from '../types.js';

describe('parsePrice', () => {
  it('parses dollar amounts', () => {
    assert.equal(parsePrice('$1.71'), 1.71);
    assert.equal(parsePrice('  $0.20  '), 0.20);
    assert.equal(parsePrice('$3'), 3);
  });
  it('parses cents', () => {
    assert.equal(parsePrice('74¢'), 0.74);
    assert.equal(parsePrice('15.4 ¢'), 0.154);
  });
  it('returns 0 for empty/garbage', () => {
    assert.equal(parsePrice(''), 0);
    assert.equal(parsePrice('   '), 0);
    assert.equal(parsePrice(null), 0);
  });
});

describe('parseQuantity', () => {
  it('parses pound formats', () => {
    assert.deepEqual(parseQuantity('Russet Potatoes, 5 lb Bag'), { qty: 5, unit: 'lb', raw: '5 lb' });
    assert.deepEqual(parseQuantity('1.5 lbs Cherry Tomatoes'), { qty: 1.5, unit: 'lb', raw: '1.5 lb' });
    assert.deepEqual(parseQuantity('2 pound bag of rice'), { qty: 2, unit: 'lb', raw: '2 lb' });
  });
  it('converts ounces to pounds', () => {
    const q = parseQuantity('Great Value Long Grain Rice, 32 oz');
    assert.ok(q);
    assert.equal(q!.unit, 'lb');
    assert.equal(q!.qty, 2); // 32 oz = 2 lb
    assert.equal(q!.raw, '32 oz');
  });
  it('handles count-style packs', () => {
    assert.deepEqual(parseQuantity('Eggs, Large, 12 ct'), { qty: 12, unit: 'each', raw: '12 ct' });
    assert.deepEqual(parseQuantity('Apples 6 pack'), { qty: 6, unit: 'each', raw: '6 ct' });
  });
  it('handles bunch with known weight table', () => {
    const q = parseQuantity('Marketside Fresh Organic Bananas, Bunch', 'banana');
    assert.ok(q);
    assert.equal(q!.unit, 'lb');
    assert.equal(q!.qty, 3);
  });
  it('falls back to each for unknown bunches', () => {
    const q = parseQuantity('Mystery Herb Bunch', 'mysteryherb');
    assert.deepEqual(q, { qty: 1, unit: 'each', raw: 'bunch' });
  });
  it('handles "each" / "ea"', () => {
    assert.deepEqual(parseQuantity('Fresh Banana, Each'), { qty: 1, unit: 'each', raw: 'each' });
  });
  it('returns null when no info', () => {
    assert.equal(parseQuantity(''), null);
    assert.equal(parseQuantity('Some Random Product Name'), null);
  });
});

describe('parseUnitPriceText', () => {
  it('parses cents per pound', () => {
    assert.equal(parseUnitPriceText('74.0 ¢/lb'), 0.74);
  });
  it('parses dollars per pound', () => {
    assert.equal(parseUnitPriceText('$2.50/lb'), 2.5);
  });
  it('converts dollars per ounce to per pound', () => {
    assert.equal(parseUnitPriceText('($0.04/ounce)'), 0.64); // 0.04 * 16
  });
  it('handles each only when typical weight known', () => {
    assert.equal(parseUnitPriceText('$0.20/each', 'banana'), 0.5); // 0.20 / 0.4
    assert.equal(parseUnitPriceText('$0.20/each', 'mystery'), null);
  });
  it('returns null on unparseable input', () => {
    assert.equal(parseUnitPriceText(''), null);
    assert.equal(parseUnitPriceText('special offer'), null);
  });
});

describe('normalizeListing', () => {
  const base: Listing = {
    name: '',
    totalPrice: 0,
    qty: null,
    unitPriceText: '',
    pricePerLb: null,
    pricePerEach: null,
  };
  it('prefers store unit price text', () => {
    const out = normalizeListing(
      { ...base, name: 'X', totalPrice: 10, qty: { qty: 5, unit: 'lb', raw: '5 lb' }, unitPriceText: '$1.50/lb' },
      'rice'
    );
    assert.equal(out.pricePerLb, 1.5);
  });
  it('derives $/lb from total/qty when no unit price', () => {
    const out = normalizeListing(
      { ...base, name: 'X', totalPrice: 10, qty: { qty: 5, unit: 'lb', raw: '5 lb' } },
      'rice'
    );
    assert.equal(out.pricePerLb, 2);
  });
  it('estimates $/lb for "each" items via typical weight', () => {
    const out = normalizeListing(
      { ...base, name: 'banana', totalPrice: 0.29, qty: { qty: 1, unit: 'each', raw: 'each' } },
      'banana'
    );
    assert.equal(out.pricePerEach, 0.29);
    assert.ok(out.pricePerLb !== null && Math.abs(out.pricePerLb - 0.29 / 0.4) < 1e-9);
  });
});

describe('pickCheapest', () => {
  it('picks the lowest $/lb', () => {
    const a: Listing = { name: 'A', totalPrice: 10, qty: null, unitPriceText: '', pricePerLb: 2, pricePerEach: null };
    const b: Listing = { name: 'B', totalPrice: 5, qty: null, unitPriceText: '', pricePerLb: 1, pricePerEach: null };
    assert.equal(pickCheapest([a, b])?.name, 'B');
  });
  it('falls back to total when no normalized prices', () => {
    const a: Listing = { name: 'A', totalPrice: 10, qty: null, unitPriceText: '', pricePerLb: null, pricePerEach: null };
    const b: Listing = { name: 'B', totalPrice: 5, qty: null, unitPriceText: '', pricePerLb: null, pricePerEach: null };
    assert.equal(pickCheapest([a, b])?.name, 'B');
  });
  it('returns null if no listings have a positive price', () => {
    assert.equal(pickCheapest([]), null);
    assert.equal(
      pickCheapest([{ name: 'A', totalPrice: 0, qty: null, unitPriceText: '', pricePerLb: null, pricePerEach: null }]),
      null
    );
  });
});
