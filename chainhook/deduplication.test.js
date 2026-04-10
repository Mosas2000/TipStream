import { test } from "node:test";
import assert from "node:assert";
import { generateEventKey, deduplicateEvents } from "./deduplication.js";

test("generateEventKey creates unique keys", () => {
  const event1 = {
    txId: "tx123",
    blockHeight: 100,
    contract: "ST1234",
    event: { event: "tip-sent" },
  };

  const event2 = {
    txId: "tx124",
    blockHeight: 100,
    contract: "ST1234",
    event: { event: "tip-sent" },
  };

  const key1 = generateEventKey(event1);
  const key2 = generateEventKey(event2);

  assert.notStrictEqual(key1, key2);
  assert(key1.includes("tx123"));
  assert(key2.includes("tx124"));
});

test("deduplicateEvents filters known events", () => {
  const stored = [
    {
      txId: "tx1",
      blockHeight: 100,
      contract: "ST1",
      event: { event: "tip-sent" },
    },
  ];

  const newEvents = [
    {
      txId: "tx1",
      blockHeight: 100,
      contract: "ST1",
      event: { event: "tip-sent" },
    },
    {
      txId: "tx2",
      blockHeight: 100,
      contract: "ST1",
      event: { event: "tip-sent" },
    },
  ];

  const result = deduplicateEvents(newEvents, stored);

  assert.strictEqual(result.deduplicated.length, 1);
  assert.strictEqual(result.duplicateCount, 1);
  assert.strictEqual(result.deduplicated[0].txId, "tx2");
});

test("deduplicateEvents returns all events when store is empty", () => {
  const newEvents = [
    {
      txId: "tx1",
      blockHeight: 100,
      contract: "ST1",
      event: { event: "tip-sent" },
    },
    {
      txId: "tx2",
      blockHeight: 100,
      contract: "ST1",
      event: { event: "tip-sent" },
    },
  ];

  const result = deduplicateEvents(newEvents, []);

  assert.strictEqual(result.deduplicated.length, 2);
  assert.strictEqual(result.duplicateCount, 0);
});

test("deduplicateEvents handles multiple duplicates in batch", () => {
  const stored = [
    {
      txId: "tx1",
      blockHeight: 100,
      contract: "ST1",
      event: { event: "tip-sent" },
    },
  ];

  const newEvents = [
    {
      txId: "tx1",
      blockHeight: 100,
      contract: "ST1",
      event: { event: "tip-sent" },
    },
    {
      txId: "tx1",
      blockHeight: 100,
      contract: "ST1",
      event: { event: "tip-sent" },
    },
    {
      txId: "tx2",
      blockHeight: 100,
      contract: "ST1",
      event: { event: "tip-sent" },
    },
  ];

  const result = deduplicateEvents(newEvents, stored);

  assert.strictEqual(result.deduplicated.length, 1);
  assert.strictEqual(result.duplicateCount, 2);
});
