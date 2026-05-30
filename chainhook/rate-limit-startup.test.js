import { test } from "node:test";
import assert from "node:assert";

test("parseRateLimitEnv validates environment variables at startup", async () => {
  const { parseRateLimitEnv } = await import("./rate-limit.js");
  
  const validConfig = parseRateLimitEnv("100", "60000", "test");
  assert.strictEqual(validConfig.maxRequests, 100);
  assert.strictEqual(validConfig.windowMs, 60000);
});

test("parseRateLimitEnv throws on invalid maxRequests string", async () => {
  const { parseRateLimitEnv } = await import("./rate-limit.js");
  
  assert.throws(() => {
    parseRateLimitEnv("invalid", "60000", "test");
  }, /Invalid test configuration.*maxRequests/);
});

test("parseRateLimitEnv throws on invalid windowMs string", async () => {
  const { parseRateLimitEnv } = await import("./rate-limit.js");
  
  assert.throws(() => {
    parseRateLimitEnv("100", "invalid", "test");
  }, /Invalid test configuration.*windowMs/);
});

test("parseRateLimitEnv throws on empty maxRequests", async () => {
  const { parseRateLimitEnv } = await import("./rate-limit.js");
  
  assert.throws(() => {
    parseRateLimitEnv("", "60000", "test");
  }, /Invalid test configuration.*maxRequests/);
});

test("parseRateLimitEnv throws on empty windowMs", async () => {
  const { parseRateLimitEnv } = await import("./rate-limit.js");
  
  assert.throws(() => {
    parseRateLimitEnv("100", "", "test");
  }, /Invalid test configuration.*windowMs/);
});

test("parseRateLimitEnv throws on whitespace-only values", async () => {
  const { parseRateLimitEnv } = await import("./rate-limit.js");
  
  assert.throws(() => {
    parseRateLimitEnv("   ", "60000", "test");
  }, /Invalid test configuration/);
  
  assert.throws(() => {
    parseRateLimitEnv("100", "   ", "test");
  }, /Invalid test configuration/);
});

test("parseRateLimitEnv parses values with leading zeros correctly", async () => {
  const { parseRateLimitEnv } = await import("./rate-limit.js");
  
  const config1 = parseRateLimitEnv("0100", "60000", "test");
  assert.strictEqual(config1.maxRequests, 100);
  
  const config2 = parseRateLimitEnv("100", "060000", "test");
  assert.strictEqual(config2.windowMs, 60000);
});

test("parseRateLimitEnv rejects hexadecimal values", async () => {
  const { parseRateLimitEnv } = await import("./rate-limit.js");
  
  assert.throws(() => {
    parseRateLimitEnv("0x64", "60000", "test");
  }, /Invalid test configuration/);
  
  assert.throws(() => {
    parseRateLimitEnv("100", "0xEA60", "test");
  }, /Invalid test configuration/);
});

test("parseRateLimitEnv parses floating point strings as integers", async () => {
  const { parseRateLimitEnv } = await import("./rate-limit.js");
  
  const config1 = parseRateLimitEnv("100.5", "60000", "test");
  assert.strictEqual(config1.maxRequests, 100);
  
  const config2 = parseRateLimitEnv("100", "60000.9", "test");
  assert.strictEqual(config2.windowMs, 60000);
});

test("parseRateLimitEnv handles scientific notation strings", async () => {
  const { parseRateLimitEnv } = await import("./rate-limit.js");
  
  // parseInt("1e2", 10) returns 1, which is below minimum for windowMs
  // So this should fail validation
  const config1 = parseRateLimitEnv("1e2", "60000", "test");
  assert.strictEqual(config1.maxRequests, 1); // parseInt stops at 'e'
  
  // parseInt("6e4", 10) returns 6, which is below minimum windowMs
  assert.throws(() => {
    parseRateLimitEnv("100", "6e4", "test");
  }, /Invalid test configuration.*windowMs must be at least 1000ms/);
});

test("parseRateLimitEnv includes config name in all error messages", async () => {
  const { parseRateLimitEnv } = await import("./rate-limit.js");
  
  try {
    parseRateLimitEnv("0", "60000", "custom config");
    assert.fail("Should have thrown");
  } catch (err) {
    assert.ok(err.message.includes("custom config"));
  }
  
  try {
    parseRateLimitEnv("100", "500", "another config");
    assert.fail("Should have thrown");
  } catch (err) {
    assert.ok(err.message.includes("another config"));
  }
});

test("parseRateLimitEnv validates range after parsing", async () => {
  const { parseRateLimitEnv } = await import("./rate-limit.js");
  
  assert.throws(() => {
    parseRateLimitEnv("0", "60000", "test");
  }, /Invalid test configuration.*maxRequests must be at least 1/);
  
  assert.throws(() => {
    parseRateLimitEnv("20000", "60000", "test");
  }, /Invalid test configuration.*maxRequests must not exceed 10000/);
  
  assert.throws(() => {
    parseRateLimitEnv("100", "500", "test");
  }, /Invalid test configuration.*windowMs must be at least 1000ms/);
  
  assert.throws(() => {
    parseRateLimitEnv("100", "4000000", "test");
  }, /Invalid test configuration.*windowMs must not exceed 3600000ms/);
});

test("parseRateLimitEnv accepts valid boundary values", async () => {
  const { parseRateLimitEnv, RATE_LIMIT_BOUNDS } = await import("./rate-limit.js");
  
  const minConfig = parseRateLimitEnv(
    String(RATE_LIMIT_BOUNDS.MAX_REQUESTS_MIN),
    String(RATE_LIMIT_BOUNDS.WINDOW_MS_MIN),
    "test"
  );
  assert.strictEqual(minConfig.maxRequests, RATE_LIMIT_BOUNDS.MAX_REQUESTS_MIN);
  assert.strictEqual(minConfig.windowMs, RATE_LIMIT_BOUNDS.WINDOW_MS_MIN);
  
  const maxConfig = parseRateLimitEnv(
    String(RATE_LIMIT_BOUNDS.MAX_REQUESTS_MAX),
    String(RATE_LIMIT_BOUNDS.WINDOW_MS_MAX),
    "test"
  );
  assert.strictEqual(maxConfig.maxRequests, RATE_LIMIT_BOUNDS.MAX_REQUESTS_MAX);
  assert.strictEqual(maxConfig.windowMs, RATE_LIMIT_BOUNDS.WINDOW_MS_MAX);
});

test("parseRateLimitEnv trims whitespace from values", async () => {
  const { parseRateLimitEnv } = await import("./rate-limit.js");
  
  const config = parseRateLimitEnv("  100  ", "  60000  ", "test");
  assert.strictEqual(config.maxRequests, 100);
  assert.strictEqual(config.windowMs, 60000);
});
