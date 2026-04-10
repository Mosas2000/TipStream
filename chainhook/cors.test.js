import { test } from "node:test";
import assert from "node:assert";
import { parseAllowedOrigins, isOriginAllowed, getCorsHeaders } from "./cors.js";

test("parseAllowedOrigins handles empty input", () => {
  const origins = parseAllowedOrigins("");
  assert(origins.includes("http://localhost:3000"));
  assert(origins.includes("http://localhost:3001"));
});

test("parseAllowedOrigins parses comma-separated list", () => {
  const origins = parseAllowedOrigins("https://example.com,https://app.example.com");
  assert.strictEqual(origins.length, 2);
  assert(origins.includes("https://example.com"));
  assert(origins.includes("https://app.example.com"));
});

test("parseAllowedOrigins trims whitespace", () => {
  const origins = parseAllowedOrigins("https://example.com , https://app.example.com ");
  assert.strictEqual(origins.length, 2);
  assert(origins.includes("https://example.com"));
  assert(origins.includes("https://app.example.com"));
});

test("isOriginAllowed accepts matching origins", () => {
  const allowed = ["https://example.com"];
  assert(isOriginAllowed("https://example.com", allowed));
});

test("isOriginAllowed rejects non-matching origins", () => {
  const allowed = ["https://example.com"];
  assert(!isOriginAllowed("https://evil.com", allowed));
});

test("isOriginAllowed accepts wildcard", () => {
  const allowed = ["*"];
  assert(isOriginAllowed("https://any.com", allowed));
  assert(isOriginAllowed("https://example.com", allowed));
});

test("isOriginAllowed rejects null or undefined", () => {
  const allowed = ["https://example.com"];
  assert(!isOriginAllowed(null, allowed));
  assert(!isOriginAllowed(undefined, allowed));
});

test("getCorsHeaders allows matching origin", () => {
  const headers = getCorsHeaders("https://example.com", ["https://example.com"]);
  assert.strictEqual(headers["Access-Control-Allow-Origin"], "https://example.com");
  assert.strictEqual(headers["Access-Control-Allow-Credentials"], "true");
});

test("getCorsHeaders blocks non-matching origin", () => {
  const headers = getCorsHeaders("https://evil.com", ["https://example.com"]);
  assert.strictEqual(headers["Access-Control-Allow-Origin"], "null");
  assert.strictEqual(headers["Access-Control-Allow-Credentials"], "false");
});

test("getCorsHeaders includes common methods and headers", () => {
  const headers = getCorsHeaders("https://example.com", ["https://example.com"]);
  assert(headers["Access-Control-Allow-Methods"].includes("GET"));
  assert(headers["Access-Control-Allow-Methods"].includes("POST"));
  assert(headers["Access-Control-Allow-Headers"].includes("Authorization"));
});
