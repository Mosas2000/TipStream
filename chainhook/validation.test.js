import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_BODY_SIZE,
  STACKS_ADDRESS_RE,
  isValidStacksAddress,
  sanitizeQueryInt,
  sanitizeCursor,
} from "./validation.js";

describe("MAX_BODY_SIZE", () => {
  it("equals 10 MB in bytes", () => {
    assert.strictEqual(MAX_BODY_SIZE, 10 * 1024 * 1024);
  });
});

describe("STACKS_ADDRESS_RE", () => {
  it("matches a valid SP mainnet address", () => {
    assert.ok(STACKS_ADDRESS_RE.test("SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T"));
  });

  it("matches a valid ST testnet address", () => {
    assert.ok(STACKS_ADDRESS_RE.test("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"));
  });

  it("matches a valid SM address", () => {
    assert.ok(STACKS_ADDRESS_RE.test("SM2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQVX8X0G7"));
  });

  it("matches case-insensitively", () => {
    assert.ok(STACKS_ADDRESS_RE.test("sp31pkqvqzvzck3fm3nh67cgd6g1fmr17vqvs2w5t"));
  });

  it("rejects an empty string", () => {
    assert.strictEqual(STACKS_ADDRESS_RE.test(""), false);
  });

  it("rejects a string with wrong prefix", () => {
    assert.strictEqual(STACKS_ADDRESS_RE.test("BT1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"), false);
  });

  it("rejects a string that is too short", () => {
    assert.strictEqual(STACKS_ADDRESS_RE.test("SP123"), false);
  });

  it("rejects a string that is too long", () => {
    assert.strictEqual(STACKS_ADDRESS_RE.test("SP" + "A".repeat(50)), false);
  });

  it("rejects a string with special characters", () => {
    assert.strictEqual(STACKS_ADDRESS_RE.test("SP31PKQVQZ!ZCK3FM3NH67"), false);
  });
});

describe("isValidStacksAddress", () => {
  it("returns true for a valid SP address", () => {
    assert.strictEqual(isValidStacksAddress("SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T"), true);
  });

  it("returns true for a valid ST address", () => {
    assert.strictEqual(isValidStacksAddress("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"), true);
  });

  it("returns false for null", () => {
    assert.strictEqual(isValidStacksAddress(null), false);
  });

  it("returns false for undefined", () => {
    assert.strictEqual(isValidStacksAddress(undefined), false);
  });

  it("returns false for a number", () => {
    assert.strictEqual(isValidStacksAddress(12345), false);
  });

  it("returns false for an empty string", () => {
    assert.strictEqual(isValidStacksAddress(""), false);
  });

  it("returns false for a malformed address", () => {
    assert.strictEqual(isValidStacksAddress("not-an-address"), false);
  });
});

describe("sanitizeQueryInt", () => {
  it("parses a valid integer within bounds", () => {
    assert.strictEqual(sanitizeQueryInt("10", 1, 100), 10);
  });

  it("returns NaN for a value below the minimum", () => {
    assert.ok(isNaN(sanitizeQueryInt("0", 1, 100)));
  });

  it("returns NaN for a value above the maximum", () => {
    assert.ok(isNaN(sanitizeQueryInt("101", 1, 100)));
  });

  it("accepts a value exactly at the minimum", () => {
    assert.strictEqual(sanitizeQueryInt("1", 1, 100), 1);
  });

  it("accepts a value exactly at the maximum", () => {
    assert.strictEqual(sanitizeQueryInt("100", 1, 100), 100);
  });

  it("returns NaN for non-numeric input", () => {
    assert.ok(isNaN(sanitizeQueryInt("abc", 0, 100)));
  });

  it("returns NaN for an empty string", () => {
    assert.ok(isNaN(sanitizeQueryInt("", 0, 100)));
  });

  it("returns NaN for a negative value when min is zero", () => {
    assert.ok(isNaN(sanitizeQueryInt("-1", 0, 100)));
  });
});

describe("sanitizeCursor", () => {
  it("returns a valid cursor string unchanged", () => {
    const cursor = "0xabc123::100::SP123.tipstream::tip-sent";
    assert.strictEqual(sanitizeCursor(cursor), cursor);
  });

  it("trims whitespace from cursor value", () => {
    assert.strictEqual(sanitizeCursor("  cursor-value  "), "cursor-value");
  });

  it("returns null for null input", () => {
    assert.strictEqual(sanitizeCursor(null), null);
  });

  it("returns null for undefined input", () => {
    assert.strictEqual(sanitizeCursor(undefined), null);
  });

  it("returns null for empty string", () => {
    assert.strictEqual(sanitizeCursor(""), null);
  });

  it("returns null for whitespace-only string", () => {
    assert.strictEqual(sanitizeCursor("   "), null);
  });

  it("returns null for cursor exceeding 512 characters", () => {
    const longCursor = "x".repeat(513);
    assert.strictEqual(sanitizeCursor(longCursor), null);
  });

  it("accepts cursor exactly at 512 character limit", () => {
    const cursor = "x".repeat(512);
    assert.strictEqual(sanitizeCursor(cursor), cursor);
  });

  it("returns null for non-string input", () => {
    assert.strictEqual(sanitizeCursor(12345), null);
  });

  it("accepts cursor with special characters", () => {
    const cursor = "0xabc::100::SP123.contract::event-name";
    assert.strictEqual(sanitizeCursor(cursor), cursor);
  });

  it("accepts cursor with URL-encoded characters", () => {
    const cursor = "0xabc%3A%3A100%3A%3ASP123";
    assert.strictEqual(sanitizeCursor(cursor), cursor);
  });

  it("accepts cursor with hyphens and underscores", () => {
    const cursor = "tx-hash_123::block-height_456::contract_name";
    assert.strictEqual(sanitizeCursor(cursor), cursor);
  });

  it("accepts cursor with dots in contract names", () => {
    const cursor = "0xabc::100::SP123.my-contract.v2::event";
    assert.strictEqual(sanitizeCursor(cursor), cursor);
  });

  it("trims and validates cursor with leading/trailing whitespace", () => {
    const cursor = "\t0xabc::100::SP123\n";
    assert.strictEqual(sanitizeCursor(cursor), "0xabc::100::SP123");
  });

  it("returns null for cursor with only special characters", () => {
    assert.strictEqual(sanitizeCursor("::::::::"), "::::::::");
  });

  it("accepts cursor with mixed case", () => {
    const cursor = "0xAbC123::100::SP123ABC.TipStream::Tip-Sent";
    assert.strictEqual(sanitizeCursor(cursor), cursor);
  });

  it("accepts cursor at boundary with whitespace trimmed", () => {
    const cursor = " " + "x".repeat(510) + " ";
    assert.strictEqual(sanitizeCursor(cursor), "x".repeat(510));
  });
});
