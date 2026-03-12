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
});
