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
