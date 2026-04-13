import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Logger, normalizeLevel, sanitizeContext } from './logging.js';

describe('logging helpers', () => {
  it('normalizes log levels', () => {
    assert.strictEqual(normalizeLevel('warn'), 'WARN');
    assert.strictEqual(normalizeLevel('invalid'), 'INFO');
  });

  it('sanitizes undefined context values', () => {
    assert.deepStrictEqual(sanitizeContext({ a: 1, b: undefined, c: null }), { a: 1, c: null });
  });
});

describe('Logger', () => {
  const originalWrite = process.stdout.write;
  let writes;

  beforeEach(() => {
    writes = [];
    process.stdout.write = (chunk) => {
      writes.push(chunk.toString());
      return true;
    };
  });

  afterEach(() => {
    process.stdout.write = originalWrite;
  });

  it('filters logs below the configured level', () => {
    const logger = new Logger('test-service');
    logger.setLevel('WARN');
    logger.info('info message');
    logger.warn('warn message');

    assert.strictEqual(writes.length, 1);
    const entry = JSON.parse(writes[0]);
    assert.strictEqual(entry.level, 'WARN');
    assert.strictEqual(entry.message, 'warn message');
  });

  it('serializes error details in structured output', () => {
    const logger = new Logger('test-service');
    logger.setLevel('DEBUG');
    logger.error('failed to process', new Error('boom'), { request_id: 'req-1' });

    assert.strictEqual(writes.length, 1);
    const entry = JSON.parse(writes[0]);
    assert.strictEqual(entry.level, 'ERROR');
    assert.strictEqual(entry.request_id, 'req-1');
    assert.strictEqual(entry.error.message, 'boom');
  });
});
