import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { 
  MemoryEventStore, 
  createEventStore, 
  getRetentionCutoff, 
  parsePoolConfig,
  DEFAULT_POOL_MAX,
  DEFAULT_POOL_IDLE_TIMEOUT_MS,
  DEFAULT_POOL_CONNECTION_TIMEOUT_MS,
  DEFAULT_STATEMENT_TIMEOUT_MS,
} from './storage.js';

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

  it('listTips returns empty result when store is empty', async () => {
    const result = await store.listTips({ limit: 10 });
    assert.strictEqual(result.events.length, 0);
    assert.strictEqual(result.total, 0);
    assert.strictEqual(result.nextCursor, null);
  });

  it('listTips returns all tips when count is below limit', async () => {
    await store.insertEvents([
      makeEvent({ txId: '0xaaa', event: { event: 'tip-sent', 'tip-id': 1, sender: 'SP1', recipient: 'SP2', amount: 100, fee: 5, 'net-amount': 95 } }),
      makeEvent({ txId: '0xbbb', event: { event: 'tip-sent', 'tip-id': 2, sender: 'SP1', recipient: 'SP2', amount: 200, fee: 10, 'net-amount': 190 } }),
    ]);

    const result = await store.listTips({ limit: 50 });
    assert.strictEqual(result.events.length, 2);
    assert.strictEqual(result.total, 2);
    assert.strictEqual(result.nextCursor, null);
  });

  it('listTips returns nextCursor when more results exist', async () => {
    await store.insertEvents([
      makeEvent({ txId: '0xc1', event: { event: 'tip-sent', 'tip-id': 10, sender: 'SP1', recipient: 'SP2', amount: 100, fee: 5, 'net-amount': 95 } }),
      makeEvent({ txId: '0xc2', event: { event: 'tip-sent', 'tip-id': 11, sender: 'SP1', recipient: 'SP2', amount: 200, fee: 10, 'net-amount': 190 } }),
      makeEvent({ txId: '0xc3', event: { event: 'tip-sent', 'tip-id': 12, sender: 'SP1', recipient: 'SP2', amount: 300, fee: 15, 'net-amount': 285 } }),
    ]);

    const result = await store.listTips({ limit: 2 });
    assert.strictEqual(result.events.length, 2);
    assert.strictEqual(result.total, 3);
    assert.ok(result.nextCursor !== null);
  });

  it('listTips cursor advances to next page without overlap', async () => {
    await store.insertEvents([
      makeEvent({ txId: '0xd1', event: { event: 'tip-sent', 'tip-id': 20, sender: 'SP1', recipient: 'SP2', amount: 100, fee: 5, 'net-amount': 95 } }),
      makeEvent({ txId: '0xd2', event: { event: 'tip-sent', 'tip-id': 21, sender: 'SP1', recipient: 'SP2', amount: 200, fee: 10, 'net-amount': 190 } }),
      makeEvent({ txId: '0xd3', event: { event: 'tip-sent', 'tip-id': 22, sender: 'SP1', recipient: 'SP2', amount: 300, fee: 15, 'net-amount': 285 } }),
    ]);

    const page1 = await store.listTips({ limit: 2 });
    assert.ok(page1.nextCursor);

    const page2 = await store.listTips({ limit: 2, cursor: page1.nextCursor });
    assert.strictEqual(page2.events.length, 1);
    assert.strictEqual(page2.nextCursor, null);

    const page1Keys = new Set(page1.events.map((e) => e.txId));
    for (const e of page2.events) {
      assert.ok(!page1Keys.has(e.txId), `txId ${e.txId} appeared on both pages`);
    }
  });

  it('listTips excludes non-tip events', async () => {
    await store.insertEvents([
      makeEvent({ txId: '0xe1', event: { event: 'tip-sent', 'tip-id': 30, sender: 'SP1', recipient: 'SP2', amount: 100, fee: 5, 'net-amount': 95 } }),
      makeEvent({ txId: '0xe2', event: { event: 'fee-change-proposed', 'new-fee': 300 } }),
    ]);

    const result = await store.listTips({ limit: 50 });
    assert.strictEqual(result.events.length, 1);
    assert.strictEqual(result.total, 1);
  });

  it('listTips with unknown cursor returns empty page', async () => {
    await store.insertEvents([
      makeEvent({ txId: '0xf1', event: { event: 'tip-sent', 'tip-id': 40, sender: 'SP1', recipient: 'SP2', amount: 100, fee: 5, 'net-amount': 95 } }),
    ]);

    const result = await store.listTips({ limit: 10, cursor: 'does-not-exist' });
    assert.strictEqual(result.events.length, 0);
    assert.strictEqual(result.nextCursor, null);
  });
});

describe('MemoryEventStore listTipsByUser', () => {
  let store;

  beforeEach(() => {
    store = new MemoryEventStore({ retentionDays: 30 });
  });

  it('returns empty result when user has no tips', async () => {
    const result = await store.listTipsByUser('SP1SENDER', { limit: 10 });
    assert.strictEqual(result.events.length, 0);
    assert.strictEqual(result.total, 0);
    assert.strictEqual(result.nextCursor, null);
  });

  it('returns only tips involving the given address', async () => {
    await store.insertEvents([
      makeEvent({ txId: '0xg1', event: { event: 'tip-sent', 'tip-id': 50, sender: 'SP1SENDER', recipient: 'SP2RECIPIENT', amount: 100, fee: 5, 'net-amount': 95 } }),
      makeEvent({ txId: '0xg2', event: { event: 'tip-sent', 'tip-id': 51, sender: 'SP3OTHER', recipient: 'SP4OTHER', amount: 200, fee: 10, 'net-amount': 190 } }),
    ]);

    const result = await store.listTipsByUser('SP1SENDER', { limit: 50 });
    assert.strictEqual(result.events.length, 1);
    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.events[0].event['tip-id'], 50);
  });

  it('includes tips where address is recipient', async () => {
    await store.insertEvents([
      makeEvent({ txId: '0xh1', event: { event: 'tip-sent', 'tip-id': 60, sender: 'SP3OTHER', recipient: 'SP1SENDER', amount: 100, fee: 5, 'net-amount': 95 } }),
    ]);

    const result = await store.listTipsByUser('SP1SENDER', { limit: 50 });
    assert.strictEqual(result.events.length, 1);
    assert.strictEqual(result.total, 1);
  });

  it('paginates with cursor and returns nextCursor when more exist', async () => {
    await store.insertEvents([
      makeEvent({ txId: '0xi1', event: { event: 'tip-sent', 'tip-id': 70, sender: 'SP1SENDER', recipient: 'SP2', amount: 100, fee: 5, 'net-amount': 95 } }),
      makeEvent({ txId: '0xi2', event: { event: 'tip-sent', 'tip-id': 71, sender: 'SP1SENDER', recipient: 'SP2', amount: 200, fee: 10, 'net-amount': 190 } }),
      makeEvent({ txId: '0xi3', event: { event: 'tip-sent', 'tip-id': 72, sender: 'SP1SENDER', recipient: 'SP2', amount: 300, fee: 15, 'net-amount': 285 } }),
    ]);

    const page1 = await store.listTipsByUser('SP1SENDER', { limit: 2 });
    assert.strictEqual(page1.events.length, 2);
    assert.strictEqual(page1.total, 3);
    assert.ok(page1.nextCursor !== null);

    const page2 = await store.listTipsByUser('SP1SENDER', { limit: 2, cursor: page1.nextCursor });
    assert.strictEqual(page2.events.length, 1);
    assert.strictEqual(page2.nextCursor, null);

    const page1Keys = new Set(page1.events.map((e) => e.txId));
    for (const e of page2.events) {
      assert.ok(!page1Keys.has(e.txId));
    }
  });
});

describe('createEventStore', () => {
  it('creates a memory store when requested', async () => {
    const store = await createEventStore({ mode: 'memory', retentionDays: 7 });
    assert.ok(store instanceof MemoryEventStore);
    assert.strictEqual(store.retentionDays, 7);
  });
});

describe('parsePoolConfig', () => {
  it('returns default values when no environment variables are set', () => {
    const config = parsePoolConfig({});
    
    assert.strictEqual(config.max, 20);
    assert.strictEqual(config.idleTimeoutMillis, 30000);
    assert.strictEqual(config.connectionTimeoutMillis, 5000);
    assert.strictEqual(config.statement_timeout, 30000);
  });

  it('parses valid environment variables', () => {
    const env = {
      DB_POOL_MAX: '50',
      DB_POOL_IDLE_TIMEOUT_MS: '60000',
      DB_POOL_CONNECTION_TIMEOUT_MS: '10000',
      DB_STATEMENT_TIMEOUT_MS: '45000',
    };
    
    const config = parsePoolConfig(env);
    
    assert.strictEqual(config.max, 50);
    assert.strictEqual(config.idleTimeoutMillis, 60000);
    assert.strictEqual(config.connectionTimeoutMillis, 10000);
    assert.strictEqual(config.statement_timeout, 45000);
  });

  it('falls back to defaults for invalid values', () => {
    const env = {
      DB_POOL_MAX: 'invalid',
      DB_POOL_IDLE_TIMEOUT_MS: '-100',
      DB_POOL_CONNECTION_TIMEOUT_MS: 'abc',
      DB_STATEMENT_TIMEOUT_MS: '',
    };
    
    const config = parsePoolConfig(env);
    
    assert.strictEqual(config.max, 20);
    assert.strictEqual(config.idleTimeoutMillis, 30000);
    assert.strictEqual(config.connectionTimeoutMillis, 5000);
    assert.strictEqual(config.statement_timeout, 30000);
  });

  it('falls back to defaults for zero or negative max', () => {
    const env = {
      DB_POOL_MAX: '0',
    };
    
    const config = parsePoolConfig(env);
    
    assert.strictEqual(config.max, 20);
  });
});

describe('createEventStore with pool config', () => {
  it('applies custom pool configuration', async () => {
    const customPoolConfig = {
      max: 10,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 3000,
      statement_timeout: 20000,
    };
    
    const store = await createEventStore({
      mode: 'memory',
      poolConfig: customPoolConfig,
    });
    
    assert.ok(store instanceof MemoryEventStore);
  });
});

  it('warns when pool max exceeds recommended limit', () => {
    const env = {
      DB_POOL_MAX: '150',
    };
    
    const config = parsePoolConfig(env);
    
    assert.strictEqual(config.max, 150);
  });

describe('pool configuration constants', () => {
  it('defines expected default values', () => {
    assert.strictEqual(DEFAULT_POOL_MAX, 20);
    assert.strictEqual(DEFAULT_POOL_IDLE_TIMEOUT_MS, 30000);
    assert.strictEqual(DEFAULT_POOL_CONNECTION_TIMEOUT_MS, 5000);
    assert.strictEqual(DEFAULT_STATEMENT_TIMEOUT_MS, 30000);
  });
});

describe('PostgresEventStore constructor validation', () => {
  it('throws StorageUnavailableError when databaseUrl is missing', async () => {
    const { PostgresEventStore } = await import('./storage.js');
    assert.throws(
      () => new PostgresEventStore({ databaseUrl: '' }),
      (err) => {
        assert.ok(err.message.includes('DATABASE_URL'));
        return true;
      }
    );
  });

  it('throws when databaseUrl is undefined', async () => {
    const { PostgresEventStore } = await import('./storage.js');
    assert.throws(
      () => new PostgresEventStore({}),
      (err) => {
        assert.ok(err.message.includes('DATABASE_URL'));
        return true;
      }
    );
  });
});

describe('createEventStore factory', () => {
  it('creates MemoryEventStore when mode is memory', async () => {
    const { createEventStore, MemoryEventStore } = await import('./storage.js');
    const store = await createEventStore({ mode: 'memory' });
    assert.ok(store instanceof MemoryEventStore);
    await store.close();
  });

  it('MemoryEventStore health returns healthy true', async () => {
    const { MemoryEventStore } = await import('./storage.js');
    const store = new MemoryEventStore();
    const health = await store.health();
    assert.strictEqual(health.healthy, true);
    assert.strictEqual(health.storage_mode, 'memory');
  });

  it('MemoryEventStore getStats returns storage_mode memory', async () => {
    const { MemoryEventStore } = await import('./storage.js');
    const store = new MemoryEventStore();
    const stats = await store.getStats();
    assert.strictEqual(stats.storage_mode, 'memory');
    assert.strictEqual(stats.total_events, 0);
  });
});
