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
