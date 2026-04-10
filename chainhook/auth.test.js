import { test } from "node:test";
import assert from "node:assert";
import { constantTimeEqual, validateBearerToken } from "./auth.js";

test("constantTimeEqual handles identical strings", () => {
  assert(constantTimeEqual("test", "test"));
  assert(constantTimeEqual("", ""));
});

test("constantTimeEqual rejects different strings", () => {
  assert(!constantTimeEqual("test", "test2"));
  assert(!constantTimeEqual("abc", "xyz"));
});

test("constantTimeEqual rejects different lengths", () => {
  assert(!constantTimeEqual("short", "longer"));
});

test("constantTimeEqual rejects non-string inputs", () => {
  assert(!constantTimeEqual(123, "123"));
  assert(!constantTimeEqual("test", null));
  assert(!constantTimeEqual(undefined, "test"));
});

test("validateBearerToken accepts valid format", () => {
  assert(validateBearerToken("Bearer secret123", "secret123"));
});

test("validateBearerToken rejects invalid format", () => {
  assert(!validateBearerToken("Bearer ", "test"));
  assert(!validateBearerToken("Basic secret123", "secret123"));
  assert(!validateBearerToken("secret123", "secret123"));
});

test("validateBearerToken rejects mismatched token", () => {
  assert(!validateBearerToken("Bearer wrongtoken", "correcttoken"));
});

test("validateBearerToken rejects null or undefined header", () => {
  assert(!validateBearerToken(null, "test"));
  assert(!validateBearerToken(undefined, "test"));
});

test("validateBearerToken rejects non-string header", () => {
  assert(!validateBearerToken(123, "test"));
  assert(!validateBearerToken({}, "test"));
});
