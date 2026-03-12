import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_BODY_SIZE,
  STACKS_ADDRESS_RE,
  isValidStacksAddress,
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
});
