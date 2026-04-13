import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEventStore, createEventStore, getRetentionCutoff } from './storage.js';

function makeEvent(overrides = {}) {
  return {
    txId: '0xabc123',
    blockHeight: 100,
    timestamp: 1700000000000,
    contract: 'SP123.tipstream',
    event: {
      event: 'tip-sent',
      'tip-id': 42,
      sender: 'SP1SENDER',
      recipient: 'SP2RECIPIENT',
      amount: 100000,
      fee: 5000,
      'net-amount': 95000,
    },
    ...overrides,
  };
}

describe('MemoryEventStore', () => {
  let store;

  beforeEach(() => {
    store = new MemoryEventStore({ retentionDays: 30 });
  });

  it('deduplicates events on insert', async () => {
    const first = makeEvent();
    const duplicate = makeEvent();

    const result = await store.insertEvents([first, duplicate]);

    assert.strictEqual(result.insertedCount, 1);
    assert.strictEqual(result.duplicateCount, 1);
    assert.strictEqual(result.totalCount, 1);

    const events = await store.listEvents();
    assert.strictEqual(events.length, 1);
    assert.deepStrictEqual(events[0], first);
  });

  it('returns storage health and stats', async () => {
    await store.insertEvents([makeEvent()]);

    const health = await store.health();
    const stats = await store.getStats();

    assert.strictEqual(health.healthy, true);
    assert.strictEqual(health.storage_mode, 'memory');
    assert.strictEqual(health.total_events, 1);
    assert.strictEqual(stats.storage_mode, 'memory');
    assert.strictEqual(stats.total_events, 1);
  });

  it('prunes expired events', async () => {
    await store.insertEvents([makeEvent()]);
    store.records[0].ingestedAt = new Date(Date.now() - (40 * 24 * 60 * 60 * 1000));

    const result = await store.pruneExpired(getRetentionCutoff(30));

    assert.strictEqual(result.deletedCount, 1);
    assert.strictEqual(await store.countEvents(), 0);
  });
});

describe('createEventStore', () => {
  it('creates a memory store when requested', async () => {
    const store = await createEventStore({ mode: 'memory', retentionDays: 7 });
    assert.ok(store instanceof MemoryEventStore);
    assert.strictEqual(store.retentionDays, 7);
  });
});
