import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ServiceUnavailableError } from './errors.js';

describe('shutdown request rejection', () => {
  it('creates ServiceUnavailableError with correct properties', () => {
    const error = new ServiceUnavailableError('service is shutting down');
    
    assert.strictEqual(error.statusCode, 503);
    assert.strictEqual(error.code, 'service_unavailable');
    assert.strictEqual(error.category, 'shutdown');
    assert.strictEqual(error.message, 'service is shutting down');
  });

  it('includes shutdown context in error details', () => {
    const error = new ServiceUnavailableError('service is shutting down', { shutdown: true });
    
    assert.strictEqual(error.details.shutdown, true);
  });
});
