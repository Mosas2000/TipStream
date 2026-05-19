import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  AddressRateLimiter,
  parseAddressWhitelist,
  validateAddressRateLimitConfig,
} from './rate-limit.js';

const ADDR_A = 'SP1SENDER000000000000000000000000000';
const ADDR_B = 'SP2RECIPIENT00000000000000000000000';
const ADDR_C = 'SP3TRUSTED000000000000000000000000A';

describe('AddressRateLimiter — basic limiting', () => {
  let limiter;

  beforeEach(() => {
    limiter = new AddressRateLimiter(3, 1000);
  });

  it('allows requests within the limit', () => {
    assert.strictEqual(limiter.isAllowed(ADDR_A), true);
    assert.strictEqual(limiter.isAllowed(ADDR_A), true);
    assert.strictEqual(limiter.isAllowed(ADDR_A), true);
  });

  it('rejects requests that exceed the limit', () => {
    limiter.isAllowed(ADDR_A);
    limiter.isAllowed(ADDR_A);
    limiter.isAllowed(ADDR_A);
    assert.strictEqual(limiter.isAllowed(ADDR_A), false);
  });

  it('tracks separate addresses independently', () => {
    limiter.isAllowed(ADDR_A);
    limiter.isAllowed(ADDR_A);
    limiter.isAllowed(ADDR_A);
    assert.strictEqual(limiter.isAllowed(ADDR_A), false);
    assert.strictEqual(limiter.isAllowed(ADDR_B), true);
  });

  it('resets after the window expires', (t, done) => {
    const fast = new AddressRateLimiter(1, 50);
    assert.strictEqual(fast.isAllowed(ADDR_A), true);
    assert.strictEqual(fast.isAllowed(ADDR_A), false);
    setTimeout(() => {
      assert.strictEqual(fast.isAllowed(ADDR_A), true);
      done();
    }, 100);
  });

  it('returns true for null or undefined address', () => {
    assert.strictEqual(limiter.isAllowed(null), true);
    assert.strictEqual(limiter.isAllowed(undefined), true);
    assert.strictEqual(limiter.isAllowed(''), true);
  });

  it('is case-insensitive for address keys', () => {
    const lower = ADDR_A.toLowerCase();
    limiter.isAllowed(ADDR_A);
    limiter.isAllowed(ADDR_A);
    limiter.isAllowed(ADDR_A);
    assert.strictEqual(limiter.isAllowed(lower), false);
  });
});

describe('AddressRateLimiter — getRemaining', () => {
  let limiter;

  beforeEach(() => {
    limiter = new AddressRateLimiter(3, 1000);
  });

  it('returns maxRequests for an unseen address', () => {
    assert.strictEqual(limiter.getRemaining(ADDR_A), 3);
  });

  it('decrements correctly after each request', () => {
    limiter.isAllowed(ADDR_A);
    assert.strictEqual(limiter.getRemaining(ADDR_A), 2);
    limiter.isAllowed(ADDR_A);
    assert.strictEqual(limiter.getRemaining(ADDR_A), 1);
    limiter.isAllowed(ADDR_A);
    assert.strictEqual(limiter.getRemaining(ADDR_A), 0);
  });

  it('returns maxRequests for null address', () => {
    assert.strictEqual(limiter.getRemaining(null), 3);
  });
});

describe('AddressRateLimiter — whitelist', () => {
  it('whitelisted addresses are always allowed regardless of limit', () => {
    const limiter = new AddressRateLimiter(1, 1000, [ADDR_C]);
    limiter.isAllowed(ADDR_C);
    limiter.isAllowed(ADDR_C);
    assert.strictEqual(limiter.isAllowed(ADDR_C), true);
  });

  it('getRemaining returns maxRequests for whitelisted address', () => {
    const limiter = new AddressRateLimiter(2, 1000, [ADDR_C]);
    limiter.isAllowed(ADDR_C);
    assert.strictEqual(limiter.getRemaining(ADDR_C), 2);
  });

  it('isWhitelisted returns true for a whitelisted address', () => {
    const limiter = new AddressRateLimiter(5, 1000, [ADDR_C]);
    assert.strictEqual(limiter.isWhitelisted(ADDR_C), true);
  });

  it('isWhitelisted returns false for a non-whitelisted address', () => {
    const limiter = new AddressRateLimiter(5, 1000, [ADDR_C]);
    assert.strictEqual(limiter.isWhitelisted(ADDR_A), false);
  });

  it('addToWhitelist adds an address at runtime', () => {
    const limiter = new AddressRateLimiter(1, 1000);
    limiter.isAllowed(ADDR_A);
    assert.strictEqual(limiter.isAllowed(ADDR_A), false);

    limiter.addToWhitelist(ADDR_A);
    assert.strictEqual(limiter.isAllowed(ADDR_A), true);
    assert.strictEqual(limiter.isWhitelisted(ADDR_A), true);
  });

  it('removeFromWhitelist removes an address at runtime', () => {
    const limiter = new AddressRateLimiter(1, 1000, [ADDR_C]);
    assert.strictEqual(limiter.isAllowed(ADDR_C), true);

    limiter.removeFromWhitelist(ADDR_C);
    assert.strictEqual(limiter.isWhitelisted(ADDR_C), false);
    limiter.isAllowed(ADDR_C);
    assert.strictEqual(limiter.isAllowed(ADDR_C), false);
  });

  it('getWhitelist returns sorted array of whitelisted addresses', () => {
    const limiter = new AddressRateLimiter(5, 1000, [ADDR_B, ADDR_A]);
    const list = limiter.getWhitelist();
    assert.ok(Array.isArray(list));
    assert.strictEqual(list.length, 2);
    assert.ok(list.includes(ADDR_A.toUpperCase()));
    assert.ok(list.includes(ADDR_B.toUpperCase()));
    assert.deepStrictEqual(list, [...list].sort());
  });

  it('whitelist constructor deduplicates entries', () => {
    const limiter = new AddressRateLimiter(5, 1000, [ADDR_A, ADDR_A, ADDR_A]);
    assert.strictEqual(limiter.getWhitelist().length, 1);
  });

  it('addToWhitelist ignores null and non-string values', () => {
    const limiter = new AddressRateLimiter(5, 1000);
    limiter.addToWhitelist(null);
    limiter.addToWhitelist(undefined);
    limiter.addToWhitelist(123);
    assert.strictEqual(limiter.getWhitelist().length, 0);
  });

  it('whitelist is case-insensitive', () => {
    const limiter = new AddressRateLimiter(1, 1000, [ADDR_C.toLowerCase()]);
    assert.strictEqual(limiter.isWhitelisted(ADDR_C), true);
    assert.strictEqual(limiter.isWhitelisted(ADDR_C.toLowerCase()), true);
  });
});

describe('AddressRateLimiter — updateConfig and getConfig', () => {
  it('getConfig returns current settings', () => {
    const limiter = new AddressRateLimiter(10, 5000);
    const config = limiter.getConfig();
    assert.strictEqual(config.maxRequests, 10);
    assert.strictEqual(config.windowMs, 5000);
    assert.strictEqual(config.whitelistSize, 0);
  });

  it('getConfig reflects whitelist size', () => {
    const limiter = new AddressRateLimiter(10, 5000, [ADDR_A, ADDR_B]);
    assert.strictEqual(limiter.getConfig().whitelistSize, 2);
  });

  it('updateConfig changes limits immediately', () => {
    const limiter = new AddressRateLimiter(1, 1000);
    limiter.isAllowed(ADDR_A);
    assert.strictEqual(limiter.isAllowed(ADDR_A), false);

    limiter.updateConfig(5, 1000);
    assert.strictEqual(limiter.isAllowed(ADDR_A), true);
    assert.strictEqual(limiter.isAllowed(ADDR_A), true);
    assert.strictEqual(limiter.isAllowed(ADDR_A), true);
  });

  it('updateConfig preserves existing counters', () => {
    const limiter = new AddressRateLimiter(3, 1000);
    limiter.isAllowed(ADDR_A);
    limiter.isAllowed(ADDR_A);
    limiter.updateConfig(3, 1000);
    assert.strictEqual(limiter.getRemaining(ADDR_A), 1);
  });
});

describe('AddressRateLimiter — cleanup', () => {
  it('removes expired entries', (t, done) => {
    const limiter = new AddressRateLimiter(1, 50);
    limiter.isAllowed(ADDR_A);
    assert.strictEqual(limiter.requests.size, 1);

    setTimeout(() => {
      limiter.cleanup();
      assert.strictEqual(limiter.requests.size, 0);
      done();
    }, 100);
  });

  it('retains entries that are still within the window', () => {
    const limiter = new AddressRateLimiter(3, 5000);
    limiter.isAllowed(ADDR_A);
    limiter.isAllowed(ADDR_B);
    limiter.cleanup();
    assert.strictEqual(limiter.requests.size, 2);
  });
});

describe('parseAddressWhitelist', () => {
  it('parses a comma-separated list', () => {
    const result = parseAddressWhitelist(`${ADDR_A},${ADDR_B}`);
    assert.deepStrictEqual(result, [ADDR_A, ADDR_B]);
  });

  it('trims whitespace around entries', () => {
    const result = parseAddressWhitelist(` ${ADDR_A} , ${ADDR_B} `);
    assert.deepStrictEqual(result, [ADDR_A, ADDR_B]);
  });

  it('filters out empty entries', () => {
    const result = parseAddressWhitelist(`${ADDR_A},,${ADDR_B},`);
    assert.strictEqual(result.length, 2);
  });

  it('returns empty array for empty string', () => {
    assert.deepStrictEqual(parseAddressWhitelist(''), []);
  });

  it('returns empty array for null', () => {
    assert.deepStrictEqual(parseAddressWhitelist(null), []);
  });

  it('returns empty array for undefined', () => {
    assert.deepStrictEqual(parseAddressWhitelist(undefined), []);
  });

  it('returns single-element array for one address', () => {
    const result = parseAddressWhitelist(ADDR_A);
    assert.deepStrictEqual(result, [ADDR_A]);
  });
});

describe('validateAddressRateLimitConfig', () => {
  it('accepts valid parameters', () => {
    const result = validateAddressRateLimitConfig(50, 60000);
    assert.strictEqual(result.valid, true);
  });

  it('rejects maxRequests below 1', () => {
    const result = validateAddressRateLimitConfig(0, 60000);
    assert.strictEqual(result.valid, false);
    assert.match(result.error, /maxRequests/);
  });

  it('rejects maxRequests above 10000', () => {
    const result = validateAddressRateLimitConfig(20000, 60000);
    assert.strictEqual(result.valid, false);
    assert.match(result.error, /maxRequests/);
  });

  it('rejects windowMs below 1000', () => {
    const result = validateAddressRateLimitConfig(50, 500);
    assert.strictEqual(result.valid, false);
    assert.match(result.error, /windowMs/);
  });

  it('rejects windowMs above 3600000', () => {
    const result = validateAddressRateLimitConfig(50, 4000000);
    assert.strictEqual(result.valid, false);
    assert.match(result.error, /windowMs/);
  });

  it('rejects non-number maxRequests', () => {
    const result = validateAddressRateLimitConfig('50', 60000);
    assert.strictEqual(result.valid, false);
  });

  it('rejects NaN values', () => {
    assert.strictEqual(validateAddressRateLimitConfig(NaN, 60000).valid, false);
    assert.strictEqual(validateAddressRateLimitConfig(50, NaN).valid, false);
  });
});
