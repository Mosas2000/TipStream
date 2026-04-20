import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateBearerToken } from './auth.js';

describe('metrics access control', () => {
  it('validates bearer token format for metrics requests', () => {
    const token = 'test-secret-token-here';

    assert.strictEqual(validateBearerToken(`Bearer ${token}`, token), true);
    assert.strictEqual(validateBearerToken(`Bearer invalid`, token), false);
    assert.strictEqual(validateBearerToken('', token), false);
    assert.strictEqual(validateBearerToken('test-secret-token-here', token), false);
    assert.strictEqual(validateBearerToken(null, token), false);
    assert.strictEqual(validateBearerToken(undefined, token), false);
  });

  it('handles edge cases in bearer token validation', () => {
    const token = 'my-token';

    assert.strictEqual(validateBearerToken('Bearer ', token), false);
    assert.strictEqual(validateBearerToken('bearer my-token', token), false);
    assert.strictEqual(validateBearerToken(' Bearer my-token', token), false);
    assert.strictEqual(validateBearerToken('Bearer my-token extra', token), false);
  });
});
