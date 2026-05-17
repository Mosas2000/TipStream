import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { withRetry, isRetryable } from './retry.js';

// ---------------------------------------------------------------------------
// These tests verify that the retry logic behaves correctly when integrated
// with storage-like operations that simulate transient database failures.
// ---------------------------------------------------------------------------

function makeConnError(code = 'ECONNREFUSED') {
  return Object.assign(new Error(`connect ${code} 127.0.0.1:5432`), { code });
}

function makePgError(code, message) {
  return Object.assign(new Error(message), { code });
}

describe('storage retry integration', () => {
  describe('transient connection failures recover', () => {
    it('recovers from ECONNREFUSED on second attempt', async () => {
      let calls = 0;
      const result = await withRetry(
        () => {
          calls++;
          if (calls === 1) throw makeConnError('ECONNREFUSED');
          return Promise.resolve({ rows: [{ count: 5 }] });
        },
        { maxAttempts: 3, baseDelayMs: 1, jitterMs: 0, operationName: 'test_count' }
      );
      assert.strictEqual(result.rows[0].count, 5);
      assert.strictEqual(calls, 2);
    });

    it('recovers from ECONNRESET on second attempt', async () => {
      let calls = 0;
      const result = await withRetry(
        () => {
          calls++;
          if (calls === 1) throw makeConnError('ECONNRESET');
          return Promise.resolve({ rows: [], rowCount: 0 });
        },
        { maxAttempts: 3, baseDelayMs: 1, jitterMs: 0, operationName: 'test_insert' }
      );
      assert.strictEqual(result.rowCount, 0);
      assert.strictEqual(calls, 2);
    });

    it('recovers from postgres 57P03 (startup) on third attempt', async () => {
      let calls = 0;
      const result = await withRetry(
        () => {
          calls++;
          if (calls < 3) throw makePgError('57P03', 'the database system is starting up');
          return Promise.resolve({ rows: [{ raw_event: {} }] });
        },
        { maxAttempts: 5, baseDelayMs: 1, jitterMs: 0, operationName: 'test_list' }
      );
      assert.ok(result.rows);
      assert.strictEqual(calls, 3);
    });

    it('recovers from postgres 53300 (too_many_connections)', async () => {
      let calls = 0;
      const result = await withRetry(
        () => {
          calls++;
          if (calls < 2) throw makePgError('53300', 'too many connections for role');
          return Promise.resolve({ rows: [] });
        },
        { maxAttempts: 3, baseDelayMs: 1, jitterMs: 0, operationName: 'test_query' }
      );
      assert.ok(Array.isArray(result.rows));
      assert.strictEqual(calls, 2);
    });

    it('recovers from "connection terminated unexpectedly" message', async () => {
      let calls = 0;
      const result = await withRetry(
        () => {
          calls++;
          if (calls === 1) throw new Error('connection terminated unexpectedly');
          return Promise.resolve({ rows: [] });
        },
        { maxAttempts: 3, baseDelayMs: 1, jitterMs: 0, operationName: 'test_query' }
      );
      assert.ok(result);
      assert.strictEqual(calls, 2);
    });

    it('recovers from "client checkout timed out" message', async () => {
      let calls = 0;
      const result = await withRetry(
        () => {
          calls++;
          if (calls === 1) throw new Error('client checkout timed out');
          return Promise.resolve({ rows: [] });
        },
        { maxAttempts: 3, baseDelayMs: 1, jitterMs: 0, operationName: 'test_query' }
      );
      assert.ok(result);
      assert.strictEqual(calls, 2);
    });
  });

  describe('non-retryable errors fail immediately', () => {
    it('does not retry on postgres constraint violation', async () => {
      let calls = 0;
      const err = makePgError('23505', 'duplicate key value violates unique constraint');
      await assert.rejects(
        () => withRetry(
          () => { calls++; throw err; },
          { maxAttempts: 5, baseDelayMs: 1, jitterMs: 0, operationName: 'test_insert' }
        ),
        (thrown) => {
          assert.strictEqual(thrown, err);
          return true;
        }
      );
      assert.strictEqual(calls, 1);
    });

    it('does not retry on postgres syntax error', async () => {
      let calls = 0;
      const err = makePgError('42601', 'syntax error at or near "SELCT"');
      await assert.rejects(
        () => withRetry(
          () => { calls++; throw err; },
          { maxAttempts: 5, baseDelayMs: 1, jitterMs: 0, operationName: 'test_query' }
        )
      );
      assert.strictEqual(calls, 1);
    });

    it('does not retry on invalid input error', async () => {
      let calls = 0;
      const err = new Error('invalid input syntax for type integer: "abc"');
      await assert.rejects(
        () => withRetry(
          () => { calls++; throw err; },
          { maxAttempts: 5, baseDelayMs: 1, jitterMs: 0, operationName: 'test_query' }
        )
      );
      assert.strictEqual(calls, 1);
    });
  });

  describe('retry exhaustion', () => {
    it('throws after exhausting all attempts', async () => {
      let calls = 0;
      const err = makeConnError('ECONNREFUSED');
      await assert.rejects(
        () => withRetry(
          () => { calls++; throw err; },
          { maxAttempts: 3, baseDelayMs: 1, jitterMs: 0, operationName: 'test_query' }
        ),
        (thrown) => {
          assert.strictEqual(thrown, err);
          return true;
        }
      );
      assert.strictEqual(calls, 3);
    });

    it('throws after 5 attempts with postgres 08006', async () => {
      let calls = 0;
      const err = makePgError('08006', 'connection failure');
      await assert.rejects(
        () => withRetry(
          () => { calls++; throw err; },
          { maxAttempts: 5, baseDelayMs: 1, jitterMs: 0, operationName: 'test_query' }
        )
      );
      assert.strictEqual(calls, 5);
    });
  });

  describe('health check retry', () => {
    it('health check uses reduced maxAttempts of 2', async () => {
      let calls = 0;
      const err = makeConnError('ECONNREFUSED');
      await assert.rejects(
        () => withRetry(
          () => { calls++; throw err; },
          { maxAttempts: 2, baseDelayMs: 1, jitterMs: 0, operationName: 'postgres_health_check' }
        )
      );
      assert.strictEqual(calls, 2);
    });

    it('health check succeeds on second attempt', async () => {
      let calls = 0;
      const result = await withRetry(
        () => {
          calls++;
          if (calls === 1) throw makeConnError('ECONNREFUSED');
          return Promise.resolve({ rows: [{ '?column?': 1 }] });
        },
        { maxAttempts: 2, baseDelayMs: 1, jitterMs: 0, operationName: 'postgres_health_check' }
      );
      assert.ok(result);
      assert.strictEqual(calls, 2);
    });
  });

  describe('isRetryable covers all storage error patterns', () => {
    const retryableCases = [
      ['ECONNREFUSED', 'ECONNREFUSED'],
      ['ECONNRESET', 'ECONNRESET'],
      ['ETIMEDOUT', 'ETIMEDOUT'],
      ['EPIPE', 'EPIPE'],
      ['EHOSTUNREACH', 'EHOSTUNREACH'],
      ['ENETUNREACH', 'ENETUNREACH'],
      ['57P03', '57P03'],
      ['53300', '53300'],
      ['08000', '08000'],
      ['08003', '08003'],
      ['08006', '08006'],
      ['40001', '40001'],
      ['40P01', '40P01'],
    ];

    for (const [label, code] of retryableCases) {
      it(`classifies ${label} as retryable`, () => {
        const err = Object.assign(new Error(label), { code });
        assert.strictEqual(isRetryable(err), true);
      });
    }

    const nonRetryableCodes = ['23505', '42601', '22003', '42703'];
    for (const code of nonRetryableCodes) {
      it(`classifies postgres ${code} as non-retryable`, () => {
        const err = Object.assign(new Error(`pg error ${code}`), { code });
        assert.strictEqual(isRetryable(err), false);
      });
    }
  });
});
