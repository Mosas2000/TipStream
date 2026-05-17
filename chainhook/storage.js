import { Pool } from 'pg';
import { generateEventKey } from './deduplication.js';
import { StorageUnavailableError } from './errors.js';
import { withRetry } from './retry.js';

const DEFAULT_POOL_MAX = 20;
const DEFAULT_POOL_IDLE_TIMEOUT_MS = 30000;
const DEFAULT_POOL_CONNECTION_TIMEOUT_MS = 5000;
const DEFAULT_STATEMENT_TIMEOUT_MS = 30000;

/**
 * Parse PostgreSQL pool configuration from environment variables.
 * 
 * @param {Object} env - Environment variables object
 * @returns {Object} Pool configuration with max, timeouts, and statement_timeout
 */

export function parseRetentionDays(value, fallback = 30) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

export function parsePoolConfig(env = {}) {
  const max = Number.parseInt(env.DB_POOL_MAX, 10);
  const idleTimeoutMillis = Number.parseInt(env.DB_POOL_IDLE_TIMEOUT_MS, 10);
  const connectionTimeoutMillis = Number.parseInt(env.DB_POOL_CONNECTION_TIMEOUT_MS, 10);
  const statementTimeout = Number.parseInt(env.DB_STATEMENT_TIMEOUT_MS, 10);

  const config = {
    max: Number.isNaN(max) || max <= 0 ? DEFAULT_POOL_MAX : max,
    idleTimeoutMillis: Number.isNaN(idleTimeoutMillis) || idleTimeoutMillis < 0 
      ? DEFAULT_POOL_IDLE_TIMEOUT_MS 
      : idleTimeoutMillis,
    connectionTimeoutMillis: Number.isNaN(connectionTimeoutMillis) || connectionTimeoutMillis < 0 
      ? DEFAULT_POOL_CONNECTION_TIMEOUT_MS 
      : connectionTimeoutMillis,
    statement_timeout: Number.isNaN(statementTimeout) || statementTimeout < 0 
      ? DEFAULT_STATEMENT_TIMEOUT_MS 
      : statementTimeout,
  };

  if (config.max > 100) {
    console.warn(`DB_POOL_MAX=${config.max} exceeds recommended maximum of 100`);
  }

  return config;
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

  /**
   * List all tip events for a specific user address.
   * Returns events where the address is either sender or recipient.
   * Results are sorted chronologically by event timestamp.
   * 
   * @param {string} address - Stacks address to lookup
   * @returns {Promise<Array>} Array of raw events
   */
  async listEventsByUser(address) {
    if (!address || typeof address !== 'string') {
      throw new Error('address must be a non-empty string');
    }
    
    return this.records
      .filter((record) => {
        const event = record.rawEvent?.event;
        if (!event) return false;
        return event.sender === address || event.recipient === address;
      })
      .sort((a, b) => a.eventTimestamp - b.eventTimestamp)
      .map((record) => record.rawEvent);
  }

  async close() {}
}

class PostgresEventStore {
  constructor({ databaseUrl, retentionDays = 30, ssl = false, poolConfig = {} } = {}) {
    if (!databaseUrl) {
      throw new StorageUnavailableError('DATABASE_URL is required for postgres storage');
    }

    this.retentionDays = retentionDays;
    this.poolConfig = poolConfig;
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: ssl ? { rejectUnauthorized: false } : undefined,
      max: poolConfig.max, // Maximum number of clients in the pool
      idleTimeoutMillis: poolConfig.idleTimeoutMillis, // Close idle clients after this time
      connectionTimeoutMillis: poolConfig.connectionTimeoutMillis, // Wait time for connection from pool
      statement_timeout: poolConfig.statement_timeout, // Query execution timeout
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
    await withRetry(
      () => this.pool.query('SELECT 1'),
      { operationName: 'postgres_connect', maxAttempts: 5, baseDelayMs: 500 }
    );

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
    await this.pool.query(`CREATE INDEX IF NOT EXISTS chainhook_events_sender_idx ON chainhook_events ((raw_event->'event'->>'sender')) WHERE event_type = 'tip-sent';`);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS chainhook_events_recipient_idx ON chainhook_events ((raw_event->'event'->>'recipient')) WHERE event_type = 'tip-sent';`);
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

    const result = await withRetry(
      () => this.pool.query(
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
      ),
      { operationName: 'postgres_insert_events' },
    );

    return {
      insertedCount: result.rowCount,
      duplicateCount: records.length - result.rowCount,
      totalCount: await this.countEvents(),
    };
  }

  async listEvents() {
    await this.init();
    const result = await withRetry(
      () => this.pool.query('SELECT raw_event FROM chainhook_events ORDER BY ingested_at ASC, event_key ASC'),
      { operationName: 'postgres_list_events' },
    );
    return result.rows.map(toRawEvent);
  }

  async countEvents() {
    await this.init();
    const result = await withRetry(
      () => this.pool.query('SELECT COUNT(*)::int AS count FROM chainhook_events'),
      { operationName: 'postgres_count_events' },
    );
    return Number(result.rows[0]?.count || 0);
  }

  async pruneExpired(cutoffMs = getRetentionCutoff(this.retentionDays)) {
    await this.init();

    if (!cutoffMs) {
      return { deletedCount: 0 };
    }

    const result = await withRetry(
      () => this.pool.query(
        'DELETE FROM chainhook_events WHERE ingested_at < to_timestamp($1 / 1000.0)',
        [cutoffMs],
      ),
      { operationName: 'postgres_prune_events' },
    );

    return { deletedCount: result.rowCount };
  }

  async getStats() {
    await this.init();
    const result = await withRetry(
      () => this.pool.query(`
        SELECT
          COUNT(*)::int AS total_events,
          MIN(ingested_at) AS oldest_ingested_at,
          MAX(ingested_at) AS newest_ingested_at
        FROM chainhook_events;
      `),
      { operationName: 'postgres_get_stats' },
    );

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
    try {
      await withRetry(
        () => this.pool.query('SELECT 1'),
        { operationName: 'postgres_health_check', maxAttempts: 2, baseDelayMs: 200 },
      );
      return {
        healthy: true,
        storage_mode: 'postgres',
        total_events: await this.countEvents(),
        pool_config: {
          max: this.poolConfig.max,
          idle_timeout_ms: this.poolConfig.idleTimeoutMillis,
          connection_timeout_ms: this.poolConfig.connectionTimeoutMillis,
          statement_timeout_ms: this.poolConfig.statement_timeout,
        },
      };
    } catch (err) {
      return {
        healthy: false,
        storage_mode: 'postgres',
        error: err.message,
        pool_config: {
          max: this.poolConfig.max,
          idle_timeout_ms: this.poolConfig.idleTimeoutMillis,
          connection_timeout_ms: this.poolConfig.connectionTimeoutMillis,
          statement_timeout_ms: this.poolConfig.statement_timeout,
        },
      };
    }
  }

  async listEventsByUser(address) {
    if (!address || typeof address !== 'string') {
      throw new Error('address must be a non-empty string');
    }

    await this.init();
    const result = await withRetry(
      () => this.pool.query(
        `
          SELECT raw_event
          FROM chainhook_events
          WHERE event_type = 'tip-sent'
            AND (
              raw_event->'event'->>'sender' = $1
              OR raw_event->'event'->>'recipient' = $1
            )
          ORDER BY ingested_at ASC, event_key ASC
        `,
        [address],
      ),
      { operationName: 'postgres_list_events_by_user' },
    );
    return result.rows.map(toRawEvent);
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
  const poolConfig = options.poolConfig || parsePoolConfig(process.env);
  
  return new PostgresEventStore({ databaseUrl, retentionDays, ssl, poolConfig });
}

export { MemoryEventStore, PostgresEventStore };
export { DEFAULT_POOL_MAX, DEFAULT_POOL_IDLE_TIMEOUT_MS, DEFAULT_POOL_CONNECTION_TIMEOUT_MS, DEFAULT_STATEMENT_TIMEOUT_MS };

class MemoryScheduledTipStore {
  constructor() {
    this.tips = [];
  }

  async init() {
    return this;
  }

  async insertScheduledTip(tip) {
    const existing = this.tips.find(t => t.id === tip.id);
    if (existing) {
      return { inserted: false, tip: existing };
    }
    this.tips.push(tip);
    return { inserted: true, tip };
  }

  async getScheduledTip(id) {
    return this.tips.find(t => t.id === id) || null;
  }

  async listScheduledTips(filters = {}) {
    let results = [...this.tips];

    if (filters.sender) {
      results = results.filter(t => t.sender === filters.sender);
    }
    if (filters.recipient) {
      results = results.filter(t => t.recipient === filters.recipient);
    }
    if (filters.status) {
      results = results.filter(t => t.status === filters.status);
    }

    results.sort((a, b) => new Date(b.scheduledFor) - new Date(a.scheduledFor));

    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    const total = results.length;
    results = results.slice(offset, offset + limit);

    return { tips: results, total };
  }

  async updateScheduledTip(id, updates) {
    const index = this.tips.findIndex(t => t.id === id);
    if (index === -1) {
      return { updated: false, tip: null };
    }
    this.tips[index] = { ...this.tips[index], ...updates, updatedAt: new Date() };
    return { updated: true, tip: this.tips[index] };
  }

  async cancelScheduledTip(id, sender) {
    const tip = this.tips.find(t => t.id === id && t.sender === sender);
    if (!tip) {
      return { cancelled: false, reason: 'not_found' };
    }
    if (tip.status !== 'pending') {
      return { cancelled: false, reason: 'not_pending' };
    }
    tip.status = 'cancelled';
    tip.updatedAt = new Date();
    return { cancelled: true, tip };
  }

  async getPendingScheduledTips() {
    const now = new Date();
    return this.tips.filter(t => t.status === 'pending' && new Date(t.scheduledFor) <= now);
  }

  async getNotifiableScheduledTips(leadMinutes = 60) {
    const now = new Date();
    return this.tips.filter(t => {
      if (t.status !== 'pending' || t.notifiedAt) return false;
      const notificationTime = new Date(new Date(t.scheduledFor).getTime() - leadMinutes * 60 * 1000);
      return now >= notificationTime;
    });
  }

  async countScheduledTips(status = null) {
    if (status) {
      return this.tips.filter(t => t.status === status).length;
    }
    return this.tips.length;
  }

  async close() {}
}

class PostgresScheduledTipStore {
  constructor(pool, poolConfig = {}) {
    this.pool = pool;
    this.poolConfig = poolConfig;
    this.ready = null;
  }

  async init() {
    if (!this.ready) {
      this.ready = this.#initialize();
    }
    return this.ready;
  }

  async #initialize() {
    await withRetry(
      () => this.pool.query('SELECT 1'),
      { operationName: 'postgres_scheduled_connect', maxAttempts: 5, baseDelayMs: 500 }
    );

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS scheduled_tips (
        id TEXT PRIMARY KEY,
        sender TEXT NOT NULL,
        recipient TEXT NOT NULL,
        amount BIGINT NOT NULL,
        scheduled_for TIMESTAMPTZ NOT NULL,
        message TEXT NOT NULL DEFAULT '',
        category INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        executed_at TIMESTAMPTZ,
        tx_id TEXT,
        failure_reason TEXT,
        notified_at TIMESTAMPTZ
      );
    `);

    await this.pool.query('CREATE INDEX IF NOT EXISTS scheduled_tips_sender_idx ON scheduled_tips (sender);');
    await this.pool.query('CREATE INDEX IF NOT EXISTS scheduled_tips_recipient_idx ON scheduled_tips (recipient);');
    await this.pool.query('CREATE INDEX IF NOT EXISTS scheduled_tips_status_idx ON scheduled_tips (status);');
    await this.pool.query('CREATE INDEX IF NOT EXISTS scheduled_tips_scheduled_for_idx ON scheduled_tips (scheduled_for);');
    await this.pool.query('CREATE INDEX IF NOT EXISTS scheduled_tips_pending_due_idx ON scheduled_tips (scheduled_for) WHERE status = \'pending\';');
  }

  async insertScheduledTip(tip) {
    await this.init();

    const result = await withRetry(
      () => this.pool.query(
        `INSERT INTO scheduled_tips (id, sender, recipient, amount, scheduled_for, message, category, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING
         RETURNING *`,
        [
          tip.id,
          tip.sender,
          tip.recipient,
          tip.amount,
          tip.scheduledFor,
          tip.message || '',
          tip.category || 0,
          tip.status || 'pending',
          tip.createdAt || new Date(),
          tip.updatedAt || new Date(),
        ]
      ),
      { operationName: 'postgres_insert_scheduled_tip' },
    );

    if (result.rowCount === 0) {
      const existing = await this.getScheduledTip(tip.id);
      return { inserted: false, tip: existing };
    }

    return { inserted: true, tip: this.#rowToTip(result.rows[0]) };
  }

  async getScheduledTip(id) {
    await this.init();
    const result = await withRetry(
      () => this.pool.query('SELECT * FROM scheduled_tips WHERE id = $1', [id]),
      { operationName: 'postgres_get_scheduled_tip' },
    );
    return result.rows[0] ? this.#rowToTip(result.rows[0]) : null;
  }

  async listScheduledTips(filters = {}) {
    await this.init();

    let query = 'SELECT * FROM scheduled_tips WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    if (filters.sender) {
      query += ` AND sender = $${paramIndex++}`;
      values.push(filters.sender);
    }
    if (filters.recipient) {
      query += ` AND recipient = $${paramIndex++}`;
      values.push(filters.recipient);
    }
    if (filters.status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(filters.status);
    }

    query += ' ORDER BY scheduled_for DESC';

    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    values.push(limit, offset);

    const result = await withRetry(
      () => this.pool.query(query, values),
      { operationName: 'postgres_list_scheduled_tips' },
    );

    const countResult = await withRetry(
      () => this.pool.query(
        'SELECT COUNT(*)::int AS count FROM scheduled_tips WHERE 1=1' +
        (filters.sender ? ' AND sender = $1' : '') +
        (filters.recipient ? ` AND recipient = $${filters.sender ? 2 : 1}` : '') +
        (filters.status ? ` AND status = $${(filters.sender ? 1 : 0) + (filters.recipient ? 1 : 0) + 1}` : ''),
        values.slice(0, -2)
      ),
      { operationName: 'postgres_count_scheduled_tips' },
    );

    return {
      tips: result.rows.map(r => this.#rowToTip(r)),
      total: countResult.rows[0]?.count || 0,
    };
  }

  async updateScheduledTip(id, updates) {
    await this.init();

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.executedAt !== undefined) {
      setClauses.push(`executed_at = $${paramIndex++}`);
      values.push(updates.executedAt);
    }
    if (updates.txId !== undefined) {
      setClauses.push(`tx_id = $${paramIndex++}`);
      values.push(updates.txId);
    }
    if (updates.failureReason !== undefined) {
      setClauses.push(`failure_reason = $${paramIndex++}`);
      values.push(updates.failureReason);
    }
    if (updates.notifiedAt !== undefined) {
      setClauses.push(`notified_at = $${paramIndex++}`);
      values.push(updates.notifiedAt);
    }

    setClauses.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    values.push(id);

    const result = await withRetry(
      () => this.pool.query(
        `UPDATE scheduled_tips SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      ),
      { operationName: 'postgres_update_scheduled_tip' },
    );

    if (result.rowCount === 0) {
      return { updated: false, tip: null };
    }

    return { updated: true, tip: this.#rowToTip(result.rows[0]) };
  }

  async cancelScheduledTip(id, sender) {
    await this.init();

    const result = await withRetry(
      () => this.pool.query(
        `UPDATE scheduled_tips SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1 AND sender = $2 AND status = 'pending'
         RETURNING *`,
        [id, sender]
      ),
      { operationName: 'postgres_cancel_scheduled_tip' },
    );

    if (result.rowCount === 0) {
      const tip = await this.getScheduledTip(id);
      if (!tip || tip.sender !== sender) {
        return { cancelled: false, reason: 'not_found' };
      }
      return { cancelled: false, reason: 'not_pending' };
    }

    return { cancelled: true, tip: this.#rowToTip(result.rows[0]) };
  }

  async getPendingScheduledTips() {
    await this.init();
    const result = await withRetry(
      () => this.pool.query(
        "SELECT * FROM scheduled_tips WHERE status = 'pending' AND scheduled_for <= NOW() ORDER BY scheduled_for ASC"
      ),
      { operationName: 'postgres_get_pending_tips' },
    );
    return result.rows.map(r => this.#rowToTip(r));
  }

  async getNotifiableScheduledTips(leadMinutes = 60) {
    await this.init();
    const result = await withRetry(
      () => this.pool.query(
        `SELECT * FROM scheduled_tips
         WHERE status = 'pending'
           AND notified_at IS NULL
           AND scheduled_for <= NOW() + INTERVAL '1 minute' * $1
           AND scheduled_for > NOW()
         ORDER BY scheduled_for ASC`,
        [leadMinutes]
      ),
      { operationName: 'postgres_get_notifiable_tips' },
    );
    return result.rows.map(r => this.#rowToTip(r));
  }

  async countScheduledTips(status = null) {
    await this.init();
    if (status) {
      const result = await withRetry(
        () => this.pool.query('SELECT COUNT(*)::int AS count FROM scheduled_tips WHERE status = $1', [status]),
        { operationName: 'postgres_count_scheduled_tips_by_status' },
      );
      return result.rows[0]?.count || 0;
    }
    const result = await withRetry(
      () => this.pool.query('SELECT COUNT(*)::int AS count FROM scheduled_tips'),
      { operationName: 'postgres_count_all_scheduled_tips' },
    );
    return result.rows[0]?.count || 0;
  }

  async close() {}

  #rowToTip(row) {
    return {
      id: row.id,
      sender: row.sender,
      recipient: row.recipient,
      amount: Number(row.amount),
      scheduledFor: row.scheduled_for,
      message: row.message || '',
      category: row.category || 0,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      executedAt: row.executed_at,
      txId: row.tx_id,
      failureReason: row.failure_reason,
      notifiedAt: row.notified_at,
    };
  }
}

export async function createScheduledTipStore(options = {}) {
  const mode = options.mode || process.env.CHAINHOOK_STORAGE || (process.env.NODE_ENV === 'test' ? 'memory' : 'postgres');

  if (mode === 'memory') {
    return new MemoryScheduledTipStore();
  }

  const databaseUrl = options.databaseUrl || process.env.DATABASE_URL;
  const ssl = options.ssl ?? process.env.DATABASE_SSL === 'true';
  const poolConfig = options.poolConfig || parsePoolConfig(process.env);

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: ssl ? { rejectUnauthorized: false } : undefined,
    max: poolConfig.max,
    idleTimeoutMillis: poolConfig.idleTimeoutMillis,
    connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
    statement_timeout: poolConfig.statement_timeout,
  });

  return new PostgresScheduledTipStore(pool, poolConfig);
}

export { MemoryScheduledTipStore, PostgresScheduledTipStore };
