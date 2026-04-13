import { Pool } from 'pg';
import { generateEventKey } from './deduplication.js';

export function parseRetentionDays(value, fallback = 30) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

export function getRetentionCutoff(retentionDays) {
  if (!retentionDays || retentionDays <= 0) {
    return null;
  }
  return Date.now() - retentionDays * 24 * 60 * 60 * 1000;
}

function toStoredEvent(event) {
  return {
    ...event,
    blockHeight: Number(event.blockHeight || 0),
    timestamp: Number(event.timestamp || Date.now()),
  };
}

function toStoredRecord(event) {
  return {
    eventKey: generateEventKey(event),
    txId: event.txId || '',
    blockHeight: Number(event.blockHeight || 0),
    eventTimestamp: Number(event.timestamp || Date.now()),
    contract: event.contract || '',
    eventType: event.event?.event || 'unknown',
    rawEvent: toStoredEvent(event),
  };
}

function toRawEvent(row) {
  return row.raw_event || row.rawEvent || row;
}

class MemoryEventStore {
  constructor({ retentionDays = 30 } = {}) {
    this.retentionDays = retentionDays;
    this.records = [];
  }

  async init() {
    return this;
  }

  async insertEvents(events) {
    const existingKeys = new Set(this.records.map((record) => record.eventKey));
    let insertedCount = 0;
    let duplicateCount = 0;

    for (const event of events) {
      const record = toStoredRecord(event);
      if (existingKeys.has(record.eventKey)) {
        duplicateCount++;
        continue;
      }

      this.records.push({
        ...record,
        ingestedAt: new Date(),
      });
      existingKeys.add(record.eventKey);
      insertedCount++;
    }

    return {
      insertedCount,
      duplicateCount,
      totalCount: this.records.length,
    };
  }

  async listEvents() {
    return this.records
      .slice()
      .sort((a, b) => a.ingestedAt - b.ingestedAt)
      .map((record) => record.rawEvent);
  }

  async countEvents() {
    return this.records.length;
  }

  async pruneExpired(cutoffMs = getRetentionCutoff(this.retentionDays)) {
    if (!cutoffMs) {
      return { deletedCount: 0 };
    }

    const before = this.records.length;
    this.records = this.records.filter((record) => record.ingestedAt.getTime() >= cutoffMs);
    return { deletedCount: before - this.records.length };
  }

  async getStats() {
    const totalEvents = this.records.length;
    const oldest = totalEvents > 0
      ? this.records.reduce((min, record) => (record.ingestedAt < min ? record.ingestedAt : min), this.records[0].ingestedAt).toISOString()
      : null;
    const newest = totalEvents > 0
      ? this.records.reduce((max, record) => (record.ingestedAt > max ? record.ingestedAt : max), this.records[0].ingestedAt).toISOString()
      : null;
    return {
      storage_mode: 'memory',
      total_events: totalEvents,
      oldest_ingested_at: oldest,
      newest_ingested_at: newest,
      retention_days: this.retentionDays,
    };
  }

  async health() {
    return {
      healthy: true,
      storage_mode: 'memory',
      total_events: this.records.length,
    };
  }

  async close() {}
}

class PostgresEventStore {
  constructor({ databaseUrl, retentionDays = 30, ssl = false } = {}) {
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required for postgres storage');
    }

    this.retentionDays = retentionDays;
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: ssl ? { rejectUnauthorized: false } : undefined,
    });
    this.ready = null;
  }

  async init() {
    if (!this.ready) {
      this.ready = this.#initialize();
    }
    return this.ready;
  }

  async #initialize() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS chainhook_events (
        event_key TEXT PRIMARY KEY,
        tx_id TEXT NOT NULL,
        block_height BIGINT NOT NULL,
        event_timestamp BIGINT NOT NULL,
        contract TEXT NOT NULL,
        event_type TEXT NOT NULL,
        raw_event JSONB NOT NULL,
        ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await this.pool.query('CREATE INDEX IF NOT EXISTS chainhook_events_tx_id_idx ON chainhook_events (tx_id);');
    await this.pool.query('CREATE INDEX IF NOT EXISTS chainhook_events_block_height_idx ON chainhook_events (block_height DESC);');
    await this.pool.query('CREATE INDEX IF NOT EXISTS chainhook_events_contract_idx ON chainhook_events (contract);');
    await this.pool.query('CREATE INDEX IF NOT EXISTS chainhook_events_ingested_at_idx ON chainhook_events (ingested_at DESC);');
  }

  async insertEvents(events) {
    await this.init();

    if (!events.length) {
      return {
        insertedCount: 0,
        duplicateCount: 0,
        totalCount: await this.countEvents(),
      };
    }

    const records = events.map(toStoredRecord);
    const values = [];
    const placeholders = records.map((record, index) => {
      const offset = index * 7;
      values.push(
        record.eventKey,
        record.txId,
        record.blockHeight,
        record.eventTimestamp,
        record.contract,
        record.eventType,
        JSON.stringify(record.rawEvent),
      );
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}::jsonb)`;
    });

    const result = await this.pool.query(
      `
        INSERT INTO chainhook_events (
          event_key,
          tx_id,
          block_height,
          event_timestamp,
          contract,
          event_type,
          raw_event
        ) VALUES ${placeholders.join(', ')}
        ON CONFLICT (event_key) DO NOTHING
        RETURNING event_key;
      `,
      values,
    );

    return {
      insertedCount: result.rowCount,
      duplicateCount: records.length - result.rowCount,
      totalCount: await this.countEvents(),
    };
  }

  async listEvents() {
    await this.init();
    const result = await this.pool.query('SELECT raw_event FROM chainhook_events ORDER BY ingested_at ASC, event_key ASC');
    return result.rows.map(toRawEvent);
  }

  async countEvents() {
    await this.init();
    const result = await this.pool.query('SELECT COUNT(*)::int AS count FROM chainhook_events');
    return Number(result.rows[0]?.count || 0);
  }

  async pruneExpired(cutoffMs = getRetentionCutoff(this.retentionDays)) {
    await this.init();

    if (!cutoffMs) {
      return { deletedCount: 0 };
    }

    const result = await this.pool.query(
      'DELETE FROM chainhook_events WHERE ingested_at < to_timestamp($1 / 1000.0)',
      [cutoffMs],
    );

    return { deletedCount: result.rowCount };
  }

  async getStats() {
    await this.init();
    const result = await this.pool.query(`
      SELECT
        COUNT(*)::int AS total_events,
        MIN(ingested_at) AS oldest_ingested_at,
        MAX(ingested_at) AS newest_ingested_at
      FROM chainhook_events;
    `);

    const row = result.rows[0] || {};
    return {
      storage_mode: 'postgres',
      total_events: Number(row.total_events || 0),
      oldest_ingested_at: row.oldest_ingested_at ? new Date(row.oldest_ingested_at).toISOString() : null,
      newest_ingested_at: row.newest_ingested_at ? new Date(row.newest_ingested_at).toISOString() : null,
      retention_days: this.retentionDays,
    };
  }

  async health() {
    await this.init();
    await this.pool.query('SELECT 1');
    return {
      healthy: true,
      storage_mode: 'postgres',
      total_events: await this.countEvents(),
    };
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

export async function createEventStore(options = {}) {
  const mode = options.mode || process.env.CHAINHOOK_STORAGE || (process.env.NODE_ENV === 'test' ? 'memory' : 'postgres');
  const retentionDays = options.retentionDays ?? parseRetentionDays(process.env.CHAINHOOK_RETENTION_DAYS, 30);

  if (mode === 'memory') {
    return new MemoryEventStore({ retentionDays });
  }

  const databaseUrl = options.databaseUrl || process.env.DATABASE_URL;
  const ssl = options.ssl ?? process.env.DATABASE_SSL === 'true';
  return new PostgresEventStore({ databaseUrl, retentionDays, ssl });
}

export { MemoryEventStore, PostgresEventStore };
