import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AddressRateLimiter, parseAddressWhitelist } from './rate-limit.js';
import { parseTipEvent } from './server.js';
import { isValidStacksAddress } from './validation.js';

const ADDR_A = 'SP1SENDER000000000000000000000000000';
const ADDR_B = 'SP2RECIPIENT00000000000000000000000';
const TRUSTED = 'SP3TRUSTED000000000000000000000000A';

function makeTipEvent(sender = ADDR_A, recipient = ADDR_B) {
  return {
    txId: '0xabc123',
    blockHeight: 100,
    timestamp: 1700000000000,
    contract: 'SP123.tipstream',
    event: {
      event: 'tip-sent',
      'tip-id': 1,
      sender,
      recipient,
      amount: 100000,
      fee: 500,
      'net-amount': 99500,
    },
  };
}

describe('dual rate limiting — IP + address', () => {
  it('parseTipEvent extracts sender for address checking', () => {
    const evt = makeTipEvent(ADDR_A, ADDR_B);
    const tip = parseTipEvent(evt);
    assert.ok(tip);
    assert.strictEqual(tip.sender, ADDR_A);
    assert.strictEqual(tip.recipient, ADDR_B);
  });

  it('address limiter blocks sender after limit is reached', () => {
    const limiter = new AddressRateLimiter(2, 1000);
    const evt = makeTipEvent(ADDR_A, ADDR_B);
    const tip = parseTipEvent(evt);

    assert.strictEqual(limiter.isAllowed(tip.sender), true);
    assert.strictEqual(limiter.isAllowed(tip.sender), true);
    assert.strictEqual(limiter.isAllowed(tip.sender), false);
  });

  it('address limiter does not block a different sender', () => {
    const limiter = new AddressRateLimiter(1, 1000);
    limiter.isAllowed(ADDR_A);
    assert.strictEqual(limiter.isAllowed(ADDR_A), false);
    assert.strictEqual(limiter.isAllowed(ADDR_B), true);
  });

  it('whitelisted sender is never blocked even after many events', () => {
    const limiter = new AddressRateLimiter(1, 1000, [TRUSTED]);
    for (let i = 0; i < 100; i++) {
      assert.strictEqual(limiter.isAllowed(TRUSTED), true);
    }
  });

  it('non-tip events do not consume address quota', () => {
    const limiter = new AddressRateLimiter(2, 1000);
    const nonTipEvent = {
      txId: '0xdef',
      blockHeight: 101,
      timestamp: 1700000001000,
      contract: 'SP123.tipstream',
      event: { event: 'profile-updated', user: ADDR_A },
    };
    const tip = parseTipEvent(nonTipEvent);
    assert.strictEqual(tip, null);
    assert.strictEqual(limiter.getRemaining(ADDR_A), 2);
  });
});

describe('whitelist management — runtime add/remove', () => {
  let limiter;

  beforeEach(() => {
    limiter = new AddressRateLimiter(1, 1000);
  });

  it('address is blocked before whitelisting', () => {
    limiter.isAllowed(ADDR_A);
    assert.strictEqual(limiter.isAllowed(ADDR_A), false);
  });

  it('address is allowed after being added to whitelist', () => {
    limiter.isAllowed(ADDR_A);
    assert.strictEqual(limiter.isAllowed(ADDR_A), false);
    limiter.addToWhitelist(ADDR_A);
    assert.strictEqual(limiter.isAllowed(ADDR_A), true);
    assert.strictEqual(limiter.isAllowed(ADDR_A), true);
  });

  it('address is blocked again after being removed from whitelist', () => {
    limiter.addToWhitelist(ADDR_A);
    assert.strictEqual(limiter.isAllowed(ADDR_A), true);
    limiter.removeFromWhitelist(ADDR_A);
    limiter.isAllowed(ADDR_A);
    assert.strictEqual(limiter.isAllowed(ADDR_A), false);
  });

  it('removing a non-whitelisted address is a no-op', () => {
    assert.doesNotThrow(() => limiter.removeFromWhitelist(ADDR_B));
    assert.strictEqual(limiter.getWhitelist().length, 0);
  });
});

describe('admin endpoint validation logic', () => {
  it('isValidStacksAddress accepts a valid SP address', () => {
    assert.strictEqual(isValidStacksAddress(ADDR_A), true);
    assert.strictEqual(isValidStacksAddress(ADDR_B), true);
    assert.strictEqual(isValidStacksAddress(TRUSTED), true);
  });

  it('isValidStacksAddress rejects an invalid address', () => {
    assert.strictEqual(isValidStacksAddress('not-an-address'), false);
    assert.strictEqual(isValidStacksAddress(''), false);
    assert.strictEqual(isValidStacksAddress(null), false);
  });

  it('parseAddressWhitelist integrates with AddressRateLimiter constructor', () => {
    const raw = `${ADDR_A},${TRUSTED}`;
    const whitelist = parseAddressWhitelist(raw);
    const limiter = new AddressRateLimiter(1, 1000, whitelist);

    assert.strictEqual(limiter.isWhitelisted(ADDR_A), true);
    assert.strictEqual(limiter.isWhitelisted(TRUSTED), true);
    assert.strictEqual(limiter.isWhitelisted(ADDR_B), false);
  });

  it('empty whitelist env var produces no whitelisted addresses', () => {
    const whitelist = parseAddressWhitelist('');
    const limiter = new AddressRateLimiter(1, 1000, whitelist);
    assert.strictEqual(limiter.getConfig().whitelistSize, 0);
  });
});

describe('address rate limit config update', () => {
  it('lowering the limit takes effect immediately', () => {
    const limiter = new AddressRateLimiter(10, 1000);
    for (let i = 0; i < 5; i++) limiter.isAllowed(ADDR_A);
    limiter.updateConfig(3, 1000);
    assert.strictEqual(limiter.isAllowed(ADDR_A), false);
  });

  it('raising the limit allows previously blocked address', () => {
    const limiter = new AddressRateLimiter(2, 1000);
    limiter.isAllowed(ADDR_A);
    limiter.isAllowed(ADDR_A);
    assert.strictEqual(limiter.isAllowed(ADDR_A), false);
    limiter.updateConfig(10, 1000);
    assert.strictEqual(limiter.isAllowed(ADDR_A), true);
  });

  it('getConfig reflects updated values', () => {
    const limiter = new AddressRateLimiter(5, 30000);
    limiter.updateConfig(20, 120000);
    const config = limiter.getConfig();
    assert.strictEqual(config.maxRequests, 20);
    assert.strictEqual(config.windowMs, 120000);
  });
});

describe('error response shape for rate-limited address', () => {
  it('getRemaining returns 0 when limit is exhausted', () => {
    const limiter = new AddressRateLimiter(2, 1000);
    limiter.isAllowed(ADDR_A);
    limiter.isAllowed(ADDR_A);
    assert.strictEqual(limiter.getRemaining(ADDR_A), 0);
    assert.strictEqual(limiter.isAllowed(ADDR_A), false);
  });

  it('remaining is included in the error context', () => {
    const limiter = new AddressRateLimiter(1, 1000);
    limiter.isAllowed(ADDR_A);
    const remaining = limiter.getRemaining(ADDR_A);
    assert.strictEqual(remaining, 0);
    const errorContext = { remaining, address: ADDR_A };
    assert.strictEqual(errorContext.remaining, 0);
    assert.strictEqual(errorContext.address, ADDR_A);
  });
});
