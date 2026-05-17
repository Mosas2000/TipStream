import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BadRequestError,
  UnauthorizedError,
  RateLimitError,
  PayloadTooLargeError,
  StorageUnavailableError,
  ServiceUnavailableError,
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
    assert.strictEqual(new ServiceUnavailableError().statusCode, 503);
    assert.strictEqual(new ServiceUnavailableError().code, 'service_unavailable');
  });
});

describe('classifyError connection and postgres codes', () => {
  const storageErrorCases = [
    ['ECONNREFUSED', 'connect ECONNREFUSED 127.0.0.1:5432'],
    ['ECONNRESET', 'read ECONNRESET'],
    ['ETIMEDOUT', 'connect ETIMEDOUT'],
    ['EPIPE', 'write EPIPE'],
    ['EHOSTUNREACH', 'connect EHOSTUNREACH'],
    ['ENETUNREACH', 'connect ENETUNREACH'],
    ['57P03', 'the database system is starting up'],
    ['53300', 'too many connections for role'],
    ['08000', 'connection exception'],
    ['08003', 'connection does not exist'],
    ['08006', 'connection failure'],
    ['40001', 'could not serialize access due to concurrent update'],
    ['40P01', 'deadlock detected'],
  ];

  for (const [code, message] of storageErrorCases) {
    it(`classifies ${code} as StorageUnavailableError`, () => {
      const err = Object.assign(new Error(message), { code });
      const classified = classifyError(err);
      assert.ok(classified instanceof StorageUnavailableError, `expected StorageUnavailableError for code ${code}`);
      assert.strictEqual(classified.statusCode, 503);
      assert.strictEqual(classified.code, 'storage_unavailable');
    });
  }

  it('classifies "connection terminated" message as StorageUnavailableError', () => {
    const err = new Error('connection terminated unexpectedly');
    const classified = classifyError(err);
    assert.ok(classified instanceof StorageUnavailableError);
  });

  it('classifies "connection reset" message as StorageUnavailableError', () => {
    const err = new Error('connection reset by peer');
    const classified = classifyError(err);
    assert.ok(classified instanceof StorageUnavailableError);
  });

  it('classifies "too many connections" message as StorageUnavailableError', () => {
    const err = new Error('too many connections for role "app"');
    const classified = classifyError(err);
    assert.ok(classified instanceof StorageUnavailableError);
  });

  it('classifies "client checkout timed out" message as StorageUnavailableError', () => {
    const err = new Error('client checkout timed out');
    const classified = classifyError(err);
    assert.ok(classified instanceof StorageUnavailableError);
  });

  it('classifies "idle timeout" message as StorageUnavailableError', () => {
    const err = new Error('idle timeout exceeded');
    const classified = classifyError(err);
    assert.ok(classified instanceof StorageUnavailableError);
  });

  it('does not classify constraint violation as StorageUnavailableError', () => {
    const err = Object.assign(new Error('duplicate key'), { code: '23505' });
    const classified = classifyError(err);
    assert.ok(!(classified instanceof StorageUnavailableError));
    assert.strictEqual(classified.statusCode, 500);
  });

  it('does not classify syntax error code as StorageUnavailableError', () => {
    const err = Object.assign(new Error('syntax error'), { code: '42601' });
    const classified = classifyError(err);
    assert.ok(!(classified instanceof StorageUnavailableError));
  });
});

describe('toErrorResponse for storage errors', () => {
  it('returns 503 for StorageUnavailableError', () => {
    const err = new StorageUnavailableError('db down');
    const { statusCode, body } = toErrorResponse(err, 'req-abc');
    assert.strictEqual(statusCode, 503);
    assert.strictEqual(body.error, 'storage_unavailable');
    assert.strictEqual(body.request_id, 'req-abc');
  });

  it('returns 503 for ECONNREFUSED classified error', () => {
    const err = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
    const { statusCode, body } = toErrorResponse(err, 'req-xyz');
    assert.strictEqual(statusCode, 503);
    assert.strictEqual(body.error, 'storage_unavailable');
  });

  it('returns 503 for 57P03 classified error', () => {
    const err = Object.assign(new Error('database starting up'), { code: '57P03' });
    const { statusCode } = toErrorResponse(err, 'req-1');
    assert.strictEqual(statusCode, 503);
  });
});
