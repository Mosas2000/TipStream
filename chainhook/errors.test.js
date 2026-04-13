import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BadRequestError,
  UnauthorizedError,
  RateLimitError,
  PayloadTooLargeError,
  StorageUnavailableError,
  classifyError,
  toErrorResponse,
} from './errors.js';

describe('error helpers', () => {
  it('classifies syntax errors as bad request', () => {
    const error = classifyError(new SyntaxError('Unexpected token'));
    assert.ok(error instanceof BadRequestError);
    assert.strictEqual(error.statusCode, 400);
    assert.strictEqual(error.code, 'bad_request');
  });

  it('preserves chainhook error details', () => {
    const error = new StorageUnavailableError('database down', { host: 'db' });
    const classified = classifyError(error);
    assert.strictEqual(classified, error);
    assert.strictEqual(classified.code, 'storage_unavailable');
    assert.strictEqual(classified.details.host, 'db');
  });

  it('maps a generic error to internal_error', () => {
    const response = toErrorResponse(new Error('boom'), 'req-1');
    assert.strictEqual(response.statusCode, 500);
    assert.strictEqual(response.body.error, 'internal_error');
    assert.strictEqual(response.body.request_id, 'req-1');
  });

  it('creates expected error subclasses', () => {
    assert.strictEqual(new UnauthorizedError().statusCode, 401);
    assert.strictEqual(new RateLimitError().statusCode, 429);
    assert.strictEqual(new PayloadTooLargeError().statusCode, 413);
  });
});
