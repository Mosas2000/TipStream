import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validatePayloadStructure, validateBlock, validateTransaction } from './server.js';

describe('payload validation', () => {
  it('rejects null payload', () => {
    const result = validatePayloadStructure(null);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'payload must be an object');
  });

  it('rejects non-object payload', () => {
    const result = validatePayloadStructure('invalid');
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'payload must be an object');
  });

  it('rejects payload without apply array', () => {
    const result = validatePayloadStructure({});
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'payload.apply must be an array');
  });

  it('rejects payload with non-array apply', () => {
    const result = validatePayloadStructure({ apply: 'not-array' });
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'payload.apply must be an array');
  });

  it('accepts valid payload structure', () => {
    const result = validatePayloadStructure({ apply: [] });
    assert.strictEqual(result.valid, true);
  });
});
