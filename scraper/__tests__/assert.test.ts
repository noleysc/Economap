import { strict as assertNode } from 'node:assert';
import { describe, it } from 'node:test';
import {
  ScraperBlockedError,
  assert,
  assertNotBlocked,
  isBlockedError,
  nonNull,
} from '../assert.js';

describe('assert', () => {
  it('passes through truthy values', () => {
    assertNode.doesNotThrow(() => assert(1, 'one'));
    assertNode.doesNotThrow(() => assert('x', 'string'));
    assertNode.doesNotThrow(() => assert({}, 'object'));
  });
  it('throws on falsy with the given message', () => {
    assertNode.throws(() => assert(0, 'zero'), /zero/);
    assertNode.throws(() => assert(null, 'nope'), /nope/);
    assertNode.throws(() => assert(undefined, 'no'), /no/);
  });
});

describe('nonNull', () => {
  it('returns the value when set', () => {
    assertNode.equal(nonNull(42, 'n'), 42);
    assertNode.equal(nonNull('hi', 's'), 'hi');
    assertNode.equal(nonNull(0, 'zero is fine'), 0);
    assertNode.equal(nonNull(false, 'false is fine'), false);
  });
  it('throws on null/undefined with the label', () => {
    assertNode.throws(() => nonNull(null, 'thing'), /thing/);
    assertNode.throws(() => nonNull(undefined, 'thing2'), /thing2/);
  });
});

describe('assertNotBlocked / isBlockedError', () => {
  it('throws ScraperBlockedError on falsy', () => {
    let caught: unknown = null;
    try {
      assertNotBlocked(false, 'walmart-bot-wall: nope');
    } catch (e) {
      caught = e;
    }
    assertNode.ok(caught instanceof ScraperBlockedError);
    assertNode.match((caught as Error).message, /walmart-bot-wall/);
    assertNode.equal(isBlockedError(caught), true);
  });
  it('passes through truthy', () => {
    assertNode.doesNotThrow(() => assertNotBlocked(true, 'fine'));
  });
  it('isBlockedError rejects ordinary errors', () => {
    assertNode.equal(isBlockedError(new Error('plain')), false);
    assertNode.equal(isBlockedError('string'), false);
    assertNode.equal(isBlockedError(null), false);
  });
});
