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


describe('block validation', () => {
  it('rejects null block', () => {
    const result = validateBlock(null, 0);
    assert.strictEqual(result.valid, false);
    assert.ok(result.reason.includes('must be an object'));
  });

  it('rejects block without block_identifier', () => {
    const result = validateBlock({}, 0);
    assert.strictEqual(result.valid, false);
    assert.ok(result.reason.includes('missing block_identifier'));
  });

  it('rejects block with non-object block_identifier', () => {
    const result = validateBlock({ block_identifier: 'invalid' }, 0);
    assert.strictEqual(result.valid, false);
    assert.ok(result.reason.includes('missing block_identifier'));
  });

  it('rejects block without block_identifier.index', () => {
    const result = validateBlock({ block_identifier: {} }, 0);
    assert.strictEqual(result.valid, false);
    assert.ok(result.reason.includes('missing block_identifier.index'));
  });

  it('accepts valid block structure', () => {
    const result = validateBlock({ block_identifier: { index: 100 } }, 0);
    assert.strictEqual(result.valid, true);
  });
});
