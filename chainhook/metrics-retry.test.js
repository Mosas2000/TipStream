import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Metrics } from './metrics.js';

describe('Metrics.recordDbRetry', () => {
  let m;

  beforeEach(() => {
    m = new Metrics();
  });

  it('initializes retry counters to zero', () => {
    assert.strictEqual(m.dbRetryAttempts, 0);
    assert.strictEqual(m.dbRetrySuccesses, 0);
    assert.strictEqual(m.dbRetryExhausted, 0);
  });

  it('increments dbRetryAttempts on "attempt"', () => {
    m.recordDbRetry('attempt');
    m.recordDbRetry('attempt');
    assert.strictEqual(m.dbRetryAttempts, 2);
  });

  it('increments dbRetrySuccesses on "success"', () => {
    m.recordDbRetry('success');
    assert.strictEqual(m.dbRetrySuccesses, 1);
  });

  it('increments dbRetryExhausted on "exhausted"', () => {
    m.recordDbRetry('exhausted');
    assert.strictEqual(m.dbRetryExhausted, 1);
  });

  it('ignores unknown outcome strings', () => {
    m.recordDbRetry('unknown');
    assert.strictEqual(m.dbRetryAttempts, 0);
    assert.strictEqual(m.dbRetrySuccesses, 0);
    assert.strictEqual(m.dbRetryExhausted, 0);
  });

  it('counters are independent', () => {
    m.recordDbRetry('attempt');
    m.recordDbRetry('attempt');
    m.recordDbRetry('success');
    m.recordDbRetry('exhausted');
    assert.strictEqual(m.dbRetryAttempts, 2);
    assert.strictEqual(m.dbRetrySuccesses, 1);
    assert.strictEqual(m.dbRetryExhausted, 1);
  });

  it('toJSON includes retry counters', () => {
    m.recordDbRetry('attempt');
    m.recordDbRetry('success');
    const json = m.toJSON();
    assert.strictEqual(json.db_retry_attempts, 1);
    assert.strictEqual(json.db_retry_successes, 1);
    assert.strictEqual(json.db_retry_exhausted, 0);
  });

  it('toJSON retry counters start at zero', () => {
    const json = m.toJSON();
    assert.strictEqual(json.db_retry_attempts, 0);
    assert.strictEqual(json.db_retry_successes, 0);
    assert.strictEqual(json.db_retry_exhausted, 0);
  });
});
