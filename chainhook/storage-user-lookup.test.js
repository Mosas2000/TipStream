import { test } from 'node:test';
import assert from 'node:assert';
import { MemoryEventStore } from './storage.js';

test('MemoryEventStore.listEventsByUser returns events for sender', async () => {
  const store = new MemoryEventStore();
  await store.init();

  const event1 = {
    txId: '0xabc',
    blockHeight: 100,
    timestamp: Date.now(),
    contract: 'SP.tipstream',
    event: {
      event: 'tip-sent',
      sender: 'SP2SENDER',
      recipient: 'SP3RECIPIENT',
      amount: 1000000,
    },
  };

  const event2 = {
    txId: '0xdef',
    blockHeight: 101,
    timestamp: Date.now(),
    contract: 'SP.tipstream',
    event: {
      event: 'tip-sent',
      sender: 'SP4OTHER',
      recipient: 'SP5ANOTHER',
      amount: 2000000,
    },
  };

  await store.insertEvents([event1, event2]);

  const results = await store.listEventsByUser('SP2SENDER');

  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].event.sender, 'SP2SENDER');
});

test('MemoryEventStore.listEventsByUser returns events for recipient', async () => {
  const store = new MemoryEventStore();
  await store.init();

  const event = {
    txId: '0xabc',
    blockHeight: 100,
    timestamp: Date.now(),
    contract: 'SP.tipstream',
    event: {
      event: 'tip-sent',
      sender: 'SP2SENDER',
      recipient: 'SP3RECIPIENT',
      amount: 1000000,
    },
  };

  await store.insertEvents([event]);

  const results = await store.listEventsByUser('SP3RECIPIENT');

  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].event.recipient, 'SP3RECIPIENT');
});

test('MemoryEventStore.listEventsByUser returns events for both sender and recipient', async () => {
  const store = new MemoryEventStore();
  await store.init();

  const event1 = {
    txId: '0xabc',
    blockHeight: 100,
    timestamp: Date.now(),
    contract: 'SP.tipstream',
    event: {
      event: 'tip-sent',
      sender: 'SP2USER',
      recipient: 'SP3OTHER',
      amount: 1000000,
    },
  };

  const event2 = {
    txId: '0xdef',
    blockHeight: 101,
    timestamp: Date.now(),
    contract: 'SP.tipstream',
    event: {
      event: 'tip-sent',
      sender: 'SP4ANOTHER',
      recipient: 'SP2USER',
      amount: 2000000,
    },
  };

  await store.insertEvents([event1, event2]);

  const results = await store.listEventsByUser('SP2USER');

  assert.strictEqual(results.length, 2);
});

test('MemoryEventStore.listEventsByUser returns empty array for unknown user', async () => {
  const store = new MemoryEventStore();
  await store.init();

  const event = {
    txId: '0xabc',
    blockHeight: 100,
    timestamp: Date.now(),
    contract: 'SP.tipstream',
    event: {
      event: 'tip-sent',
      sender: 'SP2SENDER',
      recipient: 'SP3RECIPIENT',
      amount: 1000000,
    },
  };

  await store.insertEvents([event]);

  const results = await store.listEventsByUser('SP9UNKNOWN');

  assert.strictEqual(results.length, 0);
});

test('MemoryEventStore.listEventsByUser filters out non-tip events', async () => {
  const store = new MemoryEventStore();
  await store.init();

  const tipEvent = {
    txId: '0xabc',
    blockHeight: 100,
    timestamp: Date.now(),
    contract: 'SP.tipstream',
    event: {
      event: 'tip-sent',
      sender: 'SP2USER',
      recipient: 'SP3OTHER',
      amount: 1000000,
    },
  };

  const otherEvent = {
    txId: '0xdef',
    blockHeight: 101,
    timestamp: Date.now(),
    contract: 'SP.tipstream',
    event: {
      event: 'other-event',
      data: 'some data',
    },
  };

  await store.insertEvents([tipEvent, otherEvent]);

  const results = await store.listEventsByUser('SP2USER');

  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].event.event, 'tip-sent');
});

test('MemoryEventStore.listEventsByUser returns events in chronological order', async () => {
  const store = new MemoryEventStore();
  await store.init();

  const event1 = {
    txId: '0xabc',
    blockHeight: 100,
    timestamp: Date.now() - 1000,
    contract: 'SP.tipstream',
    event: {
      event: 'tip-sent',
      sender: 'SP2USER',
      recipient: 'SP3OTHER',
      amount: 1000000,
    },
  };

  const event2 = {
    txId: '0xdef',
    blockHeight: 101,
    timestamp: Date.now(),
    contract: 'SP.tipstream',
    event: {
      event: 'tip-sent',
      sender: 'SP4ANOTHER',
      recipient: 'SP2USER',
      amount: 2000000,
    },
  };

  await store.insertEvents([event2, event1]);

  const results = await store.listEventsByUser('SP2USER');

  assert.strictEqual(results.length, 2);
  assert.strictEqual(results[0].txId, '0xabc');
  assert.strictEqual(results[1].txId, '0xdef');
});
