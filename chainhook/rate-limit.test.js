import { test } from "node:test";
import assert from "node:assert";
import { RateLimiter, getClientIp } from "./rate-limit.js";

test("RateLimiter allows requests within limit", () => {
  const limiter = new RateLimiter(3, 1000);
  assert(limiter.isAllowed("192.168.1.1"));
  assert(limiter.isAllowed("192.168.1.1"));
  assert(limiter.isAllowed("192.168.1.1"));
});

test("RateLimiter rejects requests exceeding limit", () => {
  const limiter = new RateLimiter(2, 1000);
  assert(limiter.isAllowed("192.168.1.1"));
  assert(limiter.isAllowed("192.168.1.1"));
  assert(!limiter.isAllowed("192.168.1.1"));
});

test("RateLimiter tracks separate IPs independently", () => {
  const limiter = new RateLimiter(2, 1000);
  assert(limiter.isAllowed("192.168.1.1"));
  assert(limiter.isAllowed("192.168.1.2"));
  assert(limiter.isAllowed("192.168.1.1"));
  assert(!limiter.isAllowed("192.168.1.1"));
  assert(limiter.isAllowed("192.168.1.2"));
});

test("RateLimiter resets after window expires", (t, done) => {
  const limiter = new RateLimiter(1, 1000);
  assert(limiter.isAllowed("192.168.1.1"));
  assert(!limiter.isAllowed("192.168.1.1"));

  setTimeout(() => {
    assert(limiter.isAllowed("192.168.1.1"));
    done();
  }, 1100);
});

test("RateLimiter.getRemaining returns correct count", () => {
  const limiter = new RateLimiter(3, 1000);
  assert.strictEqual(limiter.getRemaining("192.168.1.1"), 3);
  limiter.isAllowed("192.168.1.1");
  assert.strictEqual(limiter.getRemaining("192.168.1.1"), 2);
  limiter.isAllowed("192.168.1.1");
  assert.strictEqual(limiter.getRemaining("192.168.1.1"), 1);
});

test("RateLimiter.cleanup removes expired entries", (t, done) => {
  const limiter = new RateLimiter(1, 1000);
  limiter.isAllowed("192.168.1.1");
  assert.strictEqual(limiter.requests.size, 1);

  setTimeout(() => {
    limiter.cleanup();
    assert.strictEqual(limiter.requests.size, 0);
    done();
  }, 1100);
});

test("getClientIp extracts IP from socket", () => {
  const req = {
    socket: { remoteAddress: "192.168.1.1" },
    headers: {},
  };
  assert.strictEqual(getClientIp(req), "192.168.1.1");
});

test("getClientIp extracts IP from X-Forwarded-For header", () => {
  const req = {
    socket: { remoteAddress: "127.0.0.1" },
    headers: { "x-forwarded-for": "203.0.113.1, 198.51.100.2" },
  };
  assert.strictEqual(getClientIp(req), "203.0.113.1");
});

test("getClientIp handles missing socket", () => {
  const req = {
    headers: {},
  };
  const ip = getClientIp(req);
  assert(ip);
  assert.strictEqual(typeof ip, "string");
});

test("RateLimiter.updateConfig changes rate limit settings", () => {
  const limiter = new RateLimiter(2, 1000);
  assert(limiter.isAllowed("192.168.1.1"));
  assert(limiter.isAllowed("192.168.1.1"));
  assert(!limiter.isAllowed("192.168.1.1"));

  limiter.updateConfig(5, 1000);
  assert(limiter.isAllowed("192.168.1.1"));
  assert(limiter.isAllowed("192.168.1.1"));
  assert(limiter.isAllowed("192.168.1.1"));
});

test("RateLimiter.updateConfig changes window duration", () => {
  const limiter = new RateLimiter(1, 1000);
  assert(limiter.isAllowed("192.168.1.1"));
  assert(!limiter.isAllowed("192.168.1.1"));

  limiter.updateConfig(1, 2000);
  const config = limiter.getConfig();
  assert.strictEqual(config.windowMs, 2000);
});

test("RateLimiter.getConfig returns current settings", () => {
  const limiter = new RateLimiter(10, 5000);
  const config = limiter.getConfig();
  assert.strictEqual(config.maxRequests, 10);
  assert.strictEqual(config.windowMs, 5000);
});

test("RateLimiter.updateConfig applies immediately", () => {
  const limiter = new RateLimiter(1, 1000);
  limiter.isAllowed("192.168.1.1");
  assert(!limiter.isAllowed("192.168.1.1"));

  limiter.updateConfig(3, 1000);
  assert(limiter.isAllowed("192.168.1.1"));
  assert(limiter.isAllowed("192.168.1.1"));
  assert(!limiter.isAllowed("192.168.1.1"));
});

test("validateRateLimitConfig accepts valid parameters", async () => {
  const { validateRateLimitConfig } = await import("./rate-limit.js");
  const result = validateRateLimitConfig(100, 60000);
  assert.strictEqual(result.valid, true);
});

test("validateRateLimitConfig rejects maxRequests below minimum", async () => {
  const { validateRateLimitConfig } = await import("./rate-limit.js");
  const result = validateRateLimitConfig(0, 60000);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('maxRequests'));
});

test("validateRateLimitConfig rejects maxRequests above maximum", async () => {
  const { validateRateLimitConfig } = await import("./rate-limit.js");
  const result = validateRateLimitConfig(20000, 60000);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('maxRequests'));
});

test("validateRateLimitConfig rejects windowMs below minimum", async () => {
  const { validateRateLimitConfig } = await import("./rate-limit.js");
  const result = validateRateLimitConfig(100, 500);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('windowMs'));
});

test("validateRateLimitConfig rejects windowMs above maximum", async () => {
  const { validateRateLimitConfig } = await import("./rate-limit.js");
  const result = validateRateLimitConfig(100, 4000000);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('windowMs'));
});

test("validateRateLimitConfig rejects non-number maxRequests", async () => {
  const { validateRateLimitConfig } = await import("./rate-limit.js");
  const result = validateRateLimitConfig("100", 60000);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('maxRequests'));
});

test("validateRateLimitConfig rejects non-number windowMs", async () => {
  const { validateRateLimitConfig } = await import("./rate-limit.js");
  const result = validateRateLimitConfig(100, "60000");
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('windowMs'));
});

test("validateRateLimitConfig rejects NaN values", async () => {
  const { validateRateLimitConfig } = await import("./rate-limit.js");
  const result1 = validateRateLimitConfig(NaN, 60000);
  assert.strictEqual(result1.valid, false);
  
  const result2 = validateRateLimitConfig(100, NaN);
  assert.strictEqual(result2.valid, false);
});

test("validateRateLimitConfig rejects Infinity values", async () => {
  const { validateRateLimitConfig } = await import("./rate-limit.js");
  const result1 = validateRateLimitConfig(Infinity, 60000);
  assert.strictEqual(result1.valid, false);
  assert.ok(result1.error.includes('finite'));
  
  const result2 = validateRateLimitConfig(100, Infinity);
  assert.strictEqual(result2.valid, false);
  assert.ok(result2.error.includes('finite'));
});

test("validateRateLimitConfig rejects negative Infinity values", async () => {
  const { validateRateLimitConfig } = await import("./rate-limit.js");
  const result1 = validateRateLimitConfig(-Infinity, 60000);
  assert.strictEqual(result1.valid, false);
  assert.ok(result1.error.includes('finite'));
  
  const result2 = validateRateLimitConfig(100, -Infinity);
  assert.strictEqual(result2.valid, false);
  assert.ok(result2.error.includes('finite'));
});

test("validateRateLimitConfig rejects decimal values", async () => {
  const { validateRateLimitConfig } = await import("./rate-limit.js");
  const result1 = validateRateLimitConfig(100.5, 60000);
  assert.strictEqual(result1.valid, false);
  assert.ok(result1.error.includes('integer'));
  
  const result2 = validateRateLimitConfig(100, 60000.7);
  assert.strictEqual(result2.valid, false);
  assert.ok(result2.error.includes('integer'));
});

test("validateRateLimitConfig accepts boundary values", async () => {
  const { validateRateLimitConfig, RATE_LIMIT_BOUNDS } = await import("./rate-limit.js");
  
  const result1 = validateRateLimitConfig(RATE_LIMIT_BOUNDS.MAX_REQUESTS_MIN, RATE_LIMIT_BOUNDS.WINDOW_MS_MIN);
  assert.strictEqual(result1.valid, true);
  
  const result2 = validateRateLimitConfig(RATE_LIMIT_BOUNDS.MAX_REQUESTS_MAX, RATE_LIMIT_BOUNDS.WINDOW_MS_MAX);
  assert.strictEqual(result2.valid, true);
});

test("validateRateLimitConfig rejects values just outside boundaries", async () => {
  const { validateRateLimitConfig, RATE_LIMIT_BOUNDS } = await import("./rate-limit.js");
  
  const result1 = validateRateLimitConfig(RATE_LIMIT_BOUNDS.MAX_REQUESTS_MIN - 1, 60000);
  assert.strictEqual(result1.valid, false);
  
  const result2 = validateRateLimitConfig(RATE_LIMIT_BOUNDS.MAX_REQUESTS_MAX + 1, 60000);
  assert.strictEqual(result2.valid, false);
  
  const result3 = validateRateLimitConfig(100, RATE_LIMIT_BOUNDS.WINDOW_MS_MIN - 1);
  assert.strictEqual(result3.valid, false);
  
  const result4 = validateRateLimitConfig(100, RATE_LIMIT_BOUNDS.WINDOW_MS_MAX + 1);
  assert.strictEqual(result4.valid, false);
});

test("RateLimiter constructor throws on invalid config", async () => {
  const { RateLimiter } = await import("./rate-limit.js");
  
  assert.throws(() => {
    new RateLimiter(0, 60000);
  }, /Invalid rate limit configuration/);
  
  assert.throws(() => {
    new RateLimiter(100, 500);
  }, /Invalid rate limit configuration/);
  
  assert.throws(() => {
    new RateLimiter(NaN, 60000);
  }, /Invalid rate limit configuration/);
});

test("RateLimiter.updateConfig throws on invalid config", async () => {
  const { RateLimiter } = await import("./rate-limit.js");
  const limiter = new RateLimiter(100, 60000);
  
  assert.throws(() => {
    limiter.updateConfig(0, 60000);
  }, /Invalid rate limit configuration/);
  
  assert.throws(() => {
    limiter.updateConfig(100, 500);
  }, /Invalid rate limit configuration/);
  
  assert.throws(() => {
    limiter.updateConfig(Infinity, 60000);
  }, /Invalid rate limit configuration/);
});

test("AddressRateLimiter constructor throws on invalid config", async () => {
  const { AddressRateLimiter } = await import("./rate-limit.js");
  
  assert.throws(() => {
    new AddressRateLimiter(0, 60000);
  }, /Invalid address rate limit configuration/);
  
  assert.throws(() => {
    new AddressRateLimiter(100, 500);
  }, /Invalid address rate limit configuration/);
  
  assert.throws(() => {
    new AddressRateLimiter(NaN, 60000);
  }, /Invalid address rate limit configuration/);
});

test("AddressRateLimiter.updateConfig throws on invalid config", async () => {
  const { AddressRateLimiter } = await import("./rate-limit.js");
  const limiter = new AddressRateLimiter(100, 60000);
  
  assert.throws(() => {
    limiter.updateConfig(0, 60000);
  }, /Invalid address rate limit configuration/);
  
  assert.throws(() => {
    limiter.updateConfig(100, 500);
  }, /Invalid address rate limit configuration/);
  
  assert.throws(() => {
    limiter.updateConfig(-Infinity, 60000);
  }, /Invalid address rate limit configuration/);
});

test("parseRateLimitEnv parses valid configuration", async () => {
  const { parseRateLimitEnv } = await import("./rate-limit.js");
  
  const config = parseRateLimitEnv("100", "60000", "test");
  assert.strictEqual(config.maxRequests, 100);
  assert.strictEqual(config.windowMs, 60000);
});

test("parseRateLimitEnv throws on invalid maxRequests", async () => {
  const { parseRateLimitEnv } = await import("./rate-limit.js");
  
  assert.throws(() => {
    parseRateLimitEnv("invalid", "60000", "test");
  }, /Invalid test configuration.*maxRequests/);
  
  assert.throws(() => {
    parseRateLimitEnv("", "60000", "test");
  }, /Invalid test configuration.*maxRequests/);
});

test("parseRateLimitEnv throws on invalid windowMs", async () => {
  const { parseRateLimitEnv } = await import("./rate-limit.js");
  
  assert.throws(() => {
    parseRateLimitEnv("100", "invalid", "test");
  }, /Invalid test configuration.*windowMs/);
  
  assert.throws(() => {
    parseRateLimitEnv("100", "", "test");
  }, /Invalid test configuration.*windowMs/);
});

test("parseRateLimitEnv throws on out of range values", async () => {
  const { parseRateLimitEnv } = await import("./rate-limit.js");
  
  assert.throws(() => {
    parseRateLimitEnv("0", "60000", "test");
  }, /Invalid test configuration/);
  
  assert.throws(() => {
    parseRateLimitEnv("100", "500", "test");
  }, /Invalid test configuration/);
  
  assert.throws(() => {
    parseRateLimitEnv("20000", "60000", "test");
  }, /Invalid test configuration/);
});

test("parseRateLimitEnv includes config name in error messages", async () => {
  const { parseRateLimitEnv } = await import("./rate-limit.js");
  
  try {
    parseRateLimitEnv("invalid", "60000", "custom rate limit");
    assert.fail("Should have thrown");
  } catch (err) {
    assert.ok(err.message.includes("custom rate limit"));
  }
});

test("validateRateLimitConfig rejects negative maxRequests", async () => {
  const { validateRateLimitConfig } = await import("./rate-limit.js");
  const result = validateRateLimitConfig(-1, 60000);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('maxRequests must be at least 1'));
});

test("validateRateLimitConfig rejects negative windowMs", async () => {
  const { validateRateLimitConfig } = await import("./rate-limit.js");
  const result = validateRateLimitConfig(100, -1000);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('windowMs must be at least 1000ms'));
});

test("validateRateLimitConfig rejects zero maxRequests", async () => {
  const { validateRateLimitConfig } = await import("./rate-limit.js");
  const result = validateRateLimitConfig(0, 60000);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('maxRequests must be at least 1'));
});

test("validateRateLimitConfig rejects zero windowMs", async () => {
  const { validateRateLimitConfig } = await import("./rate-limit.js");
  const result = validateRateLimitConfig(100, 0);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('windowMs must be at least 1000ms'));
});

test("RateLimiter constructor throws on negative values", async () => {
  const { RateLimiter } = await import("./rate-limit.js");
  
  assert.throws(() => {
    new RateLimiter(-1, 60000);
  }, /Invalid rate limit configuration/);
  
  assert.throws(() => {
    new RateLimiter(100, -1000);
  }, /Invalid rate limit configuration/);
});

test("AddressRateLimiter constructor throws on negative values", async () => {
  const { AddressRateLimiter } = await import("./rate-limit.js");
  
  assert.throws(() => {
    new AddressRateLimiter(-1, 60000);
  }, /Invalid address rate limit configuration/);
  
  assert.throws(() => {
    new AddressRateLimiter(100, -1000);
  }, /Invalid address rate limit configuration/);
});

test("parseRateLimitEnv handles negative values in strings", async () => {
  const { parseRateLimitEnv } = await import("./rate-limit.js");
  
  assert.throws(() => {
    parseRateLimitEnv("-1", "60000", "test");
  }, /Invalid test configuration/);
  
  assert.throws(() => {
    parseRateLimitEnv("100", "-1000", "test");
  }, /Invalid test configuration/);
});

test("validateRateLimitConfig accepts exact boundary values", async () => {
  const { validateRateLimitConfig, RATE_LIMIT_BOUNDS } = await import("./rate-limit.js");
  
  const minResult = validateRateLimitConfig(
    RATE_LIMIT_BOUNDS.MAX_REQUESTS_MIN,
    RATE_LIMIT_BOUNDS.WINDOW_MS_MIN
  );
  assert.strictEqual(minResult.valid, true);
  
  const maxResult = validateRateLimitConfig(
    RATE_LIMIT_BOUNDS.MAX_REQUESTS_MAX,
    RATE_LIMIT_BOUNDS.WINDOW_MS_MAX
  );
  assert.strictEqual(maxResult.valid, true);
});

test("validateRateLimitConfig rejects string maxRequests", async () => {
  const { validateRateLimitConfig } = await import("./rate-limit.js");
  const result = validateRateLimitConfig("100", 60000);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('maxRequests must be a number'));
});

test("validateRateLimitConfig rejects string windowMs", async () => {
  const { validateRateLimitConfig } = await import("./rate-limit.js");
  const result = validateRateLimitConfig(100, "60000");
  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('windowMs must be a number'));
});

test("validateRateLimitConfig rejects null values", async () => {
  const { validateRateLimitConfig } = await import("./rate-limit.js");
  
  const result1 = validateRateLimitConfig(null, 60000);
  assert.strictEqual(result1.valid, false);
  
  const result2 = validateRateLimitConfig(100, null);
  assert.strictEqual(result2.valid, false);
});

test("validateRateLimitConfig rejects undefined values", async () => {
  const { validateRateLimitConfig } = await import("./rate-limit.js");
  
  const result1 = validateRateLimitConfig(undefined, 60000);
  assert.strictEqual(result1.valid, false);
  
  const result2 = validateRateLimitConfig(100, undefined);
  assert.strictEqual(result2.valid, false);
});

test("validateRateLimitConfig rejects object values", async () => {
  const { validateRateLimitConfig } = await import("./rate-limit.js");
  
  const result1 = validateRateLimitConfig({}, 60000);
  assert.strictEqual(result1.valid, false);
  
  const result2 = validateRateLimitConfig(100, {});
  assert.strictEqual(result2.valid, false);
});

test("validateRateLimitConfig rejects array values", async () => {
  const { validateRateLimitConfig } = await import("./rate-limit.js");
  
  const result1 = validateRateLimitConfig([100], 60000);
  assert.strictEqual(result1.valid, false);
  
  const result2 = validateRateLimitConfig(100, [60000]);
  assert.strictEqual(result2.valid, false);
});

test("RateLimiter constructor throws on string values", async () => {
  const { RateLimiter } = await import("./rate-limit.js");
  
  assert.throws(() => {
    new RateLimiter("100", 60000);
  }, /Invalid rate limit configuration/);
  
  assert.throws(() => {
    new RateLimiter(100, "60000");
  }, /Invalid rate limit configuration/);
});

test("AddressRateLimiter constructor throws on string values", async () => {
  const { AddressRateLimiter } = await import("./rate-limit.js");
  
  assert.throws(() => {
    new AddressRateLimiter("100", 60000);
  }, /Invalid address rate limit configuration/);
  
  assert.throws(() => {
    new AddressRateLimiter(100, "60000");
  }, /Invalid address rate limit configuration/);
});

test("isValidRateLimitConfig returns true for valid configuration", async () => {
  const { isValidRateLimitConfig } = await import("./rate-limit.js");
  
  assert.strictEqual(isValidRateLimitConfig(100, 60000), true);
  assert.strictEqual(isValidRateLimitConfig(1, 1000), true);
  assert.strictEqual(isValidRateLimitConfig(10000, 3600000), true);
});

test("isValidRateLimitConfig returns false for invalid configuration", async () => {
  const { isValidRateLimitConfig } = await import("./rate-limit.js");
  
  assert.strictEqual(isValidRateLimitConfig(0, 60000), false);
  assert.strictEqual(isValidRateLimitConfig(100, 500), false);
  assert.strictEqual(isValidRateLimitConfig(NaN, 60000), false);
  assert.strictEqual(isValidRateLimitConfig(100, Infinity), false);
});

test("formatValidationError returns structured error details", async () => {
  const { formatValidationError, validateRateLimitConfig, RATE_LIMIT_BOUNDS } = await import("./rate-limit.js");
  
  const validation = validateRateLimitConfig(0, 60000);
  const formatted = formatValidationError(validation, 0, 60000);
  
  assert.strictEqual(formatted.valid, false);
  assert.ok(formatted.error);
  assert.strictEqual(formatted.provided.maxRequests, 0);
  assert.strictEqual(formatted.provided.windowMs, 60000);
  assert.deepStrictEqual(formatted.bounds, RATE_LIMIT_BOUNDS);
});

test("formatValidationError includes all validation bounds", async () => {
  const { formatValidationError, validateRateLimitConfig } = await import("./rate-limit.js");
  
  const validation = validateRateLimitConfig(100, 500);
  const formatted = formatValidationError(validation, 100, 500);
  
  assert.ok(formatted.bounds.MAX_REQUESTS_MIN);
  assert.ok(formatted.bounds.MAX_REQUESTS_MAX);
  assert.ok(formatted.bounds.WINDOW_MS_MIN);
  assert.ok(formatted.bounds.WINDOW_MS_MAX);
});
