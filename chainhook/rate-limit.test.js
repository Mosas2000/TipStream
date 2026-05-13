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
  const limiter = new RateLimiter(1, 50);
  assert(limiter.isAllowed("192.168.1.1"));
  assert(!limiter.isAllowed("192.168.1.1"));

  setTimeout(() => {
    assert(limiter.isAllowed("192.168.1.1"));
    done();
  }, 100);
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
  const limiter = new RateLimiter(1, 50);
  limiter.isAllowed("192.168.1.1");
  assert.strictEqual(limiter.requests.size, 1);

  setTimeout(() => {
    limiter.cleanup();
    assert.strictEqual(limiter.requests.size, 0);
    done();
  }, 100);
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
  const limiter = new RateLimiter(1, 100);
  assert(limiter.isAllowed("192.168.1.1"));
  assert(!limiter.isAllowed("192.168.1.1"));

  limiter.updateConfig(1, 50);
  const config = limiter.getConfig();
  assert.strictEqual(config.windowMs, 50);
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
