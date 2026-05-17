import { describe, it, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { isRetryable, calculateBackoff, withRetry, DEFAULT_MAX_ATTEMPTS, DEFAULT_BASE_DELAY_MS, DEFAULT_MAX_DELAY_MS } from './retry.js';

// ---------------------------------------------------------------------------
// isRetryable
// ---------------------------------------------------------------------------

describe('isRetryable', () => {
  it('returns false for null or undefined', () => {
    assert.strictEqual(isRetryable(null), false);
    assert.strictEqual(isRetryable(undefined), false);
  });

  it('returns true for ECONNREFUSED', () => {
    const err = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
    assert.strictEqual(isRetryable(err), true);
  });

  it('returns true for ECONNRESET', () => {
    const err = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
    assert.strictEqual(isRetryable(err), true);
  });

  it('returns true for ETIMEDOUT', () => {
    const err = Object.assign(new Error('connect ETIMEDOUT'), { code: 'ETIMEDOUT' });
    assert.strictEqual(isRetryable(err), true);
  });

  it('returns true for EPIPE', () => {
    const err = Object.assign(new Error('write EPIPE'), { code: 'EPIPE' });
    assert.strictEqual(isRetryable(err), true);
  });

  it('returns true for EHOSTUNREACH', () => {
    const err = Object.assign(new Error('connect EHOSTUNREACH'), { code: 'EHOSTUNREACH' });
    assert.strictEqual(isRetryable(err), true);
  });

  it('returns true for postgres 57P03 (cannot_connect_now)', () => {
    const err = Object.assign(new Error('the database system is starting up'), { code: '57P03' });
    assert.strictEqual(isRetryable(err), true);
  });

  it('returns true for postgres 53300 (too_many_connections)', () => {
    const err = Object.assign(new Error('too many connections'), { code: '53300' });
    assert.strictEqual(isRetryable(err), true);
  });

  it('returns true for postgres 08006 (connection_failure)', () => {
    const err = Object.assign(new Error('connection failure'), { code: '08006' });
    assert.strictEqual(isRetryable(err), true);
  });

  it('returns true for postgres 40001 (serialization_failure)', () => {
    const err = Object.assign(new Error('could not serialize access'), { code: '40001' });
    assert.strictEqual(isRetryable(err), true);
  });

  it('returns true for postgres 40P01 (deadlock_detected)', () => {
    const err = Object.assign(new Error('deadlock detected'), { code: '40P01' });
    assert.strictEqual(isRetryable(err), true);
  });

  it('returns true for "connection refused" in message', () => {
    const err = new Error('connection refused by server');
    assert.strictEqual(isRetryable(err), true);
  });

  it('returns true for "connection terminated" in message', () => {
    const err = new Error('connection terminated unexpectedly');
    assert.strictEqual(isRetryable(err), true);
  });

  it('returns true for "too many connections" in message', () => {
    const err = new Error('too many connections for role');
    assert.strictEqual(isRetryable(err), true);
  });

  it('returns true for "client checkout timed out" in message', () => {
    const err = new Error('client checkout timed out');
    assert.strictEqual(isRetryable(err), true);
  });

  it('returns false for a generic application error', () => {
    const err = new Error('invalid input syntax for type integer');
    assert.strictEqual(isRetryable(err), false);
  });

  it('returns false for a syntax error', () => {
    const err = new SyntaxError('unexpected token');
    assert.strictEqual(isRetryable(err), false);
  });

  it('returns false for a validation error with no code', () => {
    const err = new Error('value out of range');
    assert.strictEqual(isRetryable(err), false);
  });
});

// ---------------------------------------------------------------------------
// calculateBackoff
// ---------------------------------------------------------------------------

describe('calculateBackoff', () => {
  it('returns a value >= baseDelayMs for attempt 0', () => {
    const delay = calculateBackoff(0, 200, 30000, 0);
    assert.ok(delay >= 200, `expected >= 200, got ${delay}`);
  });

  it('doubles the base delay on each attempt', () => {
    const d0 = calculateBackoff(0, 100, 100000, 0);
    const d1 = calculateBackoff(1, 100, 100000, 0);
    const d2 = calculateBackoff(2, 100, 100000, 0);
    assert.strictEqual(d0, 100);
    assert.strictEqual(d1, 200);
    assert.strictEqual(d2, 400);
  });

  it('caps delay at maxDelayMs', () => {
    const delay = calculateBackoff(20, 200, 1000, 0);
    assert.strictEqual(delay, 1000);
  });

  it('adds jitter within the specified range', () => {
    for (let i = 0; i < 20; i++) {
      const delay = calculateBackoff(0, 200, 30000, 50);
      assert.ok(delay >= 200 && delay < 250, `jitter out of range: ${delay}`);
    }
  });

  it('returns 0 jitter when jitterMs is 0', () => {
    const delay = calculateBackoff(0, 200, 30000, 0);
    assert.strictEqual(delay, 200);
  });
});

// ---------------------------------------------------------------------------
// withRetry
// ---------------------------------------------------------------------------

describe('withRetry', () => {
  it('returns the result on first success', async () => {
    const result = await withRetry(() => Promise.resolve(42), { operationName: 'test' });
    assert.strictEqual(result, 42);
  });

  it('retries on retryable error and succeeds', async () => {
    let calls = 0;
    const result = await withRetry(
      () => {
        calls++;
        if (calls < 3) {
          const err = Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' });
          return Promise.reject(err);
        }
        return Promise.resolve('ok');
      },
      { maxAttempts: 5, baseDelayMs: 1, jitterMs: 0, operationName: 'test' }
    );
    assert.strictEqual(result, 'ok');
    assert.strictEqual(calls, 3);
  });

  it('throws immediately on non-retryable error', async () => {
    let calls = 0;
    const err = new Error('invalid input');
    await assert.rejects(
      () => withRetry(
        () => { calls++; return Promise.reject(err); },
        { maxAttempts: 5, baseDelayMs: 1, jitterMs: 0, operationName: 'test' }
      ),
      (thrown) => {
        assert.strictEqual(thrown, err);
        return true;
      }
    );
    assert.strictEqual(calls, 1);
  });

  it('exhausts all attempts and throws the last error', async () => {
    let calls = 0;
    const err = Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' });
    await assert.rejects(
      () => withRetry(
        () => { calls++; return Promise.reject(err); },
        { maxAttempts: 3, baseDelayMs: 1, jitterMs: 0, operationName: 'test' }
      ),
      (thrown) => {
        assert.strictEqual(thrown, err);
        return true;
      }
    );
    assert.strictEqual(calls, 3);
  });

  it('respects maxAttempts of 1 (no retries)', async () => {
    let calls = 0;
    const err = Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' });
    await assert.rejects(
      () => withRetry(
        () => { calls++; return Promise.reject(err); },
        { maxAttempts: 1, baseDelayMs: 1, jitterMs: 0, operationName: 'test' }
      )
    );
    assert.strictEqual(calls, 1);
  });

  it('uses custom shouldRetry predicate', async () => {
    let calls = 0;
    const err = new Error('custom transient error');
    const result = await withRetry(
      () => {
        calls++;
        if (calls < 2) return Promise.reject(err);
        return Promise.resolve('done');
      },
      {
        maxAttempts: 3,
        baseDelayMs: 1,
        jitterMs: 0,
        operationName: 'test',
        shouldRetry: (e) => e.message.includes('custom transient'),
      }
    );
    assert.strictEqual(result, 'done');
    assert.strictEqual(calls, 2);
  });

  it('succeeds on the last allowed attempt', async () => {
    let calls = 0;
    const err = Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' });
    const result = await withRetry(
      () => {
        calls++;
        if (calls < 5) return Promise.reject(err);
        return Promise.resolve('last');
      },
      { maxAttempts: 5, baseDelayMs: 1, jitterMs: 0, operationName: 'test' }
    );
    assert.strictEqual(result, 'last');
    assert.strictEqual(calls, 5);
  });
});
