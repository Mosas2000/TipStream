import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { parseBody, extractEvents, parseTipEvent } from "./server.js";
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

  it("rejects an empty body", async () => {
    const stream = createStream(Buffer.alloc(0));
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

describe("extractEvents", () => {
  it("returns an empty array for an empty payload", () => {
    assert.deepStrictEqual(extractEvents({}), []);
  });

  it("extracts SmartContractEvent entries from a chainhook payload", () => {
    const payload = {
      apply: [
        {
          block_identifier: { index: 100 },
          timestamp: 1700000000,
          transactions: [
            {
              transaction_identifier: { hash: "0xabc123" },
              metadata: {
                receipt: {
                  events: [
                    {
                      type: "SmartContractEvent",
                      data: {
                        contract_identifier: "SP123.tipstream",
                        value: { event: "tip-sent", sender: "SP1" },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
    };
    const events = extractEvents(payload);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].txId, "0xabc123");
    assert.strictEqual(events[0].blockHeight, 100);
    assert.strictEqual(events[0].contract, "SP123.tipstream");
  });

  it("skips events without a value field", () => {
    const payload = {
      apply: [
        {
          block_identifier: { index: 50 },
          timestamp: 1700000000,
          transactions: [
            {
              transaction_identifier: { hash: "0xdef" },
              metadata: {
                receipt: {
                  events: [
                    { type: "SmartContractEvent", data: {} },
                  ],
                },
              },
            },
          ],
        },
      ],
    };
    assert.deepStrictEqual(extractEvents(payload), []);
  });

  it("extracts print_event entries alongside SmartContractEvent", () => {
    const payload = {
      apply: [
        {
          block_identifier: { index: 300 },
          timestamp: 1700000000,
          transactions: [
            {
              transaction_identifier: { hash: "0xprint1" },
              metadata: {
                receipt: {
                  events: [
                    {
                      type: "print_event",
                      data: {
                        contract_identifier: "SP123.tipstream",
                        value: { event: "tip-sent" },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
    };
    const events = extractEvents(payload);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].txId, "0xprint1");
  });

  it("skips events with unrecognised type", () => {
    const payload = {
      apply: [
        {
          block_identifier: { index: 400 },
          timestamp: 1700000000,
          transactions: [
            {
              transaction_identifier: { hash: "0xother" },
              metadata: {
                receipt: {
                  events: [
                    {
                      type: "STXTransferEvent",
                      data: { value: "some-value" },
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
    };
    assert.deepStrictEqual(extractEvents(payload), []);
  });

  it("reads value from contract_event fallback when data is absent", () => {
    const payload = {
      apply: [
        {
          block_identifier: { index: 500 },
          timestamp: 1700000000,
          transactions: [
            {
              transaction_identifier: { hash: "0xfallback" },
              metadata: {
                receipt: {
                  events: [
                    {
                      type: "SmartContractEvent",
                      contract_event: {
                        contract_identifier: "SP999.tipstream",
                        raw_value: { event: "tip-sent" },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
    };
    const events = extractEvents(payload);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].contract, "SP999.tipstream");
  });

  it("handles multiple transactions in a single block", () => {
    const payload = {
      apply: [
        {
          block_identifier: { index: 600 },
          timestamp: 1700000000,
          transactions: [
            {
              transaction_identifier: { hash: "0xtx1" },
              metadata: { receipt: { events: [
                { type: "SmartContractEvent", data: { value: { a: 1 } } },
              ] } },
            },
            {
              transaction_identifier: { hash: "0xtx2" },
              metadata: { receipt: { events: [
                { type: "SmartContractEvent", data: { value: { b: 2 } } },
              ] } },
            },
          ],
        },
      ],
    };
    const events = extractEvents(payload);
    assert.strictEqual(events.length, 2);
    assert.strictEqual(events[0].txId, "0xtx1");
    assert.strictEqual(events[1].txId, "0xtx2");
  });
});

describe("parseTipEvent", () => {
  it("parses a valid tip-sent event", () => {
    const event = {
      txId: "0xabc",
      blockHeight: 200,
      timestamp: 1700000000,
      event: {
        event: "tip-sent",
        "tip-id": 42,
        sender: "SP1SENDER",
        recipient: "SP2RECIPIENT",
        amount: 100000,
        fee: 5000,
        "net-amount": 95000,
      },
    };
    const tip = parseTipEvent(event);
    assert.strictEqual(tip.tipId, 42);
    assert.strictEqual(tip.sender, "SP1SENDER");
    assert.strictEqual(tip.recipient, "SP2RECIPIENT");
    assert.strictEqual(tip.amount, 100000);
    assert.strictEqual(tip.fee, 5000);
    assert.strictEqual(tip.netAmount, 95000);
    assert.strictEqual(tip.txId, "0xabc");
    assert.strictEqual(tip.blockHeight, 200);
  });

  it("returns null for a non-tip event", () => {
    const event = {
      txId: "0xdef",
      blockHeight: 201,
      timestamp: 1700000001,
      event: { event: "badge-minted" },
    };
    assert.strictEqual(parseTipEvent(event), null);
  });

  it("returns null when event field is missing", () => {
    assert.strictEqual(parseTipEvent({ txId: "0x1" }), null);
  });

  it("returns null when event field is a string", () => {
    assert.strictEqual(parseTipEvent({ event: "some-string" }), null);
  });
});
