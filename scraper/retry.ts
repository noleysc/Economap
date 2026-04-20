import { isBlockedError } from './assert.js';
import { log } from './log.js';

export interface RetryOptions {
  attempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  label: string;
  /**
   * Optional extra check on top of the built-in `ScraperBlockedError`
   * detection. Returning true short-circuits the retry loop.
   */
  isFatal?: (err: unknown) => boolean;
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions
): Promise<{ value: T; attempts: number }> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= opts.attempts; attempt++) {
    try {
      const value = await fn(attempt);
      return { value, attempts: attempt };
    } catch (err) {
      lastErr = err;
      const fatal = isBlockedError(err) || opts.isFatal?.(err);
      if (fatal) {
        log.warn(`${opts.label}: fatal error, not retrying`, {
          error: String((err as Error)?.message ?? err),
        });
        break;
      }
      if (attempt === opts.attempts) break;
      const delay = Math.min(opts.maxDelayMs, opts.baseDelayMs * 2 ** (attempt - 1));
      const jitter = Math.floor(Math.random() * 250);
      log.warn(`${opts.label}: attempt ${attempt} failed, retrying in ${delay + jitter}ms`, {
        error: String((err as Error)?.message ?? err),
      });
      await new Promise((r) => setTimeout(r, delay + jitter));
    }
  }
  throw lastErr;
}
