import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { parseBody } from "./server.js";
import { MAX_BODY_SIZE } from "./validation.js";

/**
 * Create a Readable stream that emits the given buffer as a single chunk.
 */
function createStream(buf) {
  const stream = new Readable({ read() {} });
  stream.push(buf);
  stream.push(null);
  return stream;
}

describe("parseBody", () => {
  it("parses a valid JSON body", async () => {
    const body = JSON.stringify({ hello: "world" });
    const stream = createStream(Buffer.from(body));
    const result = await parseBody(stream);
    assert.deepStrictEqual(result, { hello: "world" });
  });

  it("rejects invalid JSON", async () => {
    const stream = createStream(Buffer.from("not json"));
    await assert.rejects(() => parseBody(stream), {
      name: "SyntaxError",
    });
  });

  it("rejects a body that exceeds MAX_BODY_SIZE", async () => {
    const oversized = Buffer.alloc(MAX_BODY_SIZE + 1, "x");
    const stream = new Readable({ read() {} });
    // Push in two chunks to exercise the size accumulation
    const half = Math.ceil(oversized.length / 2);
    stream.push(oversized.subarray(0, half));
    stream.push(oversized.subarray(half));
    stream.push(null);
    await assert.rejects(() => parseBody(stream), {
      message: "Request body too large",
    });
  });

  it("accepts a body exactly at MAX_BODY_SIZE", async () => {
    // Build a JSON string that is exactly MAX_BODY_SIZE bytes
    const padding = "x".repeat(MAX_BODY_SIZE - 17); // {"data":"..."}
    const json = JSON.stringify({ data: padding });
    const stream = createStream(Buffer.from(json));
    const result = await parseBody(stream);
    assert.strictEqual(result.data, padding);
  });
});
