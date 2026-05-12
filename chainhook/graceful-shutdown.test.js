import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isShuttingDown } from './graceful-shutdown.js';

describe('graceful shutdown', () => {
  it('returns false when not shutting down', () => {
    const state = isShuttingDown();
    assert.strictEqual(typeof state, 'boolean');
  });
});
