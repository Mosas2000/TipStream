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
