/**
 * Assertion utilities for the scraper.
 *
 * Two flavors:
 *   - `assert(cond, msg)` and `nonNull(x, msg)` are programmer-error invariants.
 *     They throw a generic Error and will be retried by the orchestrator like
 *     any other transient failure.
 *   - `assertNotBlocked(cond, msg)` throws `ScraperBlockedError`, which the
 *     retry layer recognises as fatal: there's no point hammering a bot wall.
 *
 * Using these idioms removes a lot of `if (!x) throw new Error(...)` and
 * `if (count === 0) continue` boilerplate from the store scrapers, and gives
 * us cleaner type narrowing via TypeScript's `asserts` predicates.
 */

export class ScraperBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScraperBlockedError';
  }
}

export function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
}

export function nonNull<T>(x: T | null | undefined, msg: string): T {
  if (x === null || x === undefined) {
    throw new Error(`assertion failed: expected non-null ${msg}`);
  }
  return x;
}

export function assertNotBlocked(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new ScraperBlockedError(msg);
}

export function isBlockedError(err: unknown): err is ScraperBlockedError {
  return err instanceof ScraperBlockedError;
}
