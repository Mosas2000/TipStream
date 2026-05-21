import { isValidStacksAddress } from "./validation.js";

export const NOTIFICATION_CHANNELS = {
  IN_APP: "in_app",
  EMAIL: "email",
};

export const NOTIFICATION_EVENT_TYPES = {
  TIP_RECEIVED: "tip_received",
  TIP_SENT: "tip_sent",
  SCHEDULED_TIP_EXECUTED: "scheduled_tip_executed",
  SCHEDULED_TIP_FAILED: "scheduled_tip_failed",
  REFUND_REQUESTED: "refund_requested",
  REFUND_RESOLVED: "refund_resolved",
};

export const DEFAULT_PREFERENCES = {
  channels: {
    [NOTIFICATION_CHANNELS.IN_APP]: true,
    [NOTIFICATION_CHANNELS.EMAIL]: false,
  },
  events: {
    [NOTIFICATION_EVENT_TYPES.TIP_RECEIVED]: true,
    [NOTIFICATION_EVENT_TYPES.TIP_SENT]: false,
    [NOTIFICATION_EVENT_TYPES.SCHEDULED_TIP_EXECUTED]: true,
    [NOTIFICATION_EVENT_TYPES.SCHEDULED_TIP_FAILED]: true,
    [NOTIFICATION_EVENT_TYPES.REFUND_REQUESTED]: true,
    [NOTIFICATION_EVENT_TYPES.REFUND_RESOLVED]: true,
  },
  email: null,
};

export function validatePreferencesPayload(body) {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "request body must be an object" };
  }

  if (body.channels !== undefined) {
    if (typeof body.channels !== "object" || Array.isArray(body.channels)) {
      return { valid: false, error: "channels must be an object" };
    }
    for (const [key, value] of Object.entries(body.channels)) {
      if (!Object.values(NOTIFICATION_CHANNELS).includes(key)) {
        return { valid: false, error: `unknown channel: ${key}` };
      }
      if (typeof value !== "boolean") {
        return { valid: false, error: `channel value for '${key}' must be a boolean` };
      }
    }
  }

  if (body.events !== undefined) {
    if (typeof body.events !== "object" || Array.isArray(body.events)) {
      return { valid: false, error: "events must be an object" };
    }
    for (const [key, value] of Object.entries(body.events)) {
      if (!Object.values(NOTIFICATION_EVENT_TYPES).includes(key)) {
        return { valid: false, error: `unknown event type: ${key}` };
      }
      if (typeof value !== "boolean") {
        return { valid: false, error: `event value for '${key}' must be a boolean` };
      }
    }
  }

  if (body.email !== undefined && body.email !== null) {
    if (typeof body.email !== "string") {
      return { valid: false, error: "email must be a string or null" };
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(body.email)) {
      return { valid: false, error: "email must be a valid email address" };
    }
    if (body.email.length > 254) {
      return { valid: false, error: "email must be 254 characters or fewer" };
    }
  }

  return { valid: true };
}

export function mergePreferences(existing, updates) {
  const merged = {
    channels: { ...existing.channels },
    events: { ...existing.events },
    email: existing.email,
  };

  if (updates.channels) {
    merged.channels = { ...merged.channels, ...updates.channels };
  }
  if (updates.events) {
    merged.events = { ...merged.events, ...updates.events };
  }
  if ("email" in updates) {
    merged.email = updates.email;
  }

  return merged;
}

export class MemoryNotificationPreferencesStore {
  constructor() {
    this._store = new Map();
  }

  async init() {
    return this;
  }

  async getPreferences(address) {
    if (!isValidStacksAddress(address)) {
      throw new Error("invalid address");
    }
    return this._store.get(address) || { ...DEFAULT_PREFERENCES, address };
  }

  async upsertPreferences(address, preferences) {
    if (!isValidStacksAddress(address)) {
      throw new Error("invalid address");
    }
    const existing = this._store.get(address) || { ...DEFAULT_PREFERENCES };
    const merged = mergePreferences(existing, preferences);
    const record = {
      ...merged,
      address,
      updatedAt: new Date().toISOString(),
    };
    this._store.set(address, record);
    return record;
  }

  async deletePreferences(address) {
    if (!isValidStacksAddress(address)) {
      throw new Error("invalid address");
    }
    const existed = this._store.has(address);
    this._store.delete(address);
    return { deleted: existed };
  }

  async close() {}
}

export class PostgresNotificationPreferencesStore {
  constructor(pool, retryOptions = {}) {
    this._pool = pool;
    this._retryOptions = retryOptions;
    this._ready = null;
  }

  async init() {
    if (!this._ready) {
      this._ready = this._initialize();
    }
    return this._ready;
  }

  async _initialize() {
    await this._pool.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        address TEXT PRIMARY KEY,
        channels JSONB NOT NULL DEFAULT '{}',
        events JSONB NOT NULL DEFAULT '{}',
        email TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await this._pool.query(
      "CREATE INDEX IF NOT EXISTS notification_preferences_address_idx ON notification_preferences (address);"
    );
  }

  async getPreferences(address) {
    if (!isValidStacksAddress(address)) {
      throw new Error("invalid address");
    }
    await this.init();
    const result = await this._pool.query(
      "SELECT * FROM notification_preferences WHERE address = $1",
      [address]
    );
    if (!result.rows[0]) {
      return { ...DEFAULT_PREFERENCES, address };
    }
    return this._rowToPreferences(result.rows[0]);
  }

  async upsertPreferences(address, preferences) {
    if (!isValidStacksAddress(address)) {
      throw new Error("invalid address");
    }
    await this.init();

    const existing = await this.getPreferences(address);
    const merged = mergePreferences(existing, preferences);

    const result = await this._pool.query(
      `INSERT INTO notification_preferences (address, channels, events, email, updated_at)
       VALUES ($1, $2::jsonb, $3::jsonb, $4, NOW())
       ON CONFLICT (address) DO UPDATE SET
         channels = $2::jsonb,
         events = $3::jsonb,
         email = $4,
         updated_at = NOW()
       RETURNING *`,
      [
        address,
        JSON.stringify(merged.channels),
        JSON.stringify(merged.events),
        merged.email || null,
      ]
    );
    return this._rowToPreferences(result.rows[0]);
  }

  async deletePreferences(address) {
    if (!isValidStacksAddress(address)) {
      throw new Error("invalid address");
    }
    await this.init();
    const result = await this._pool.query(
      "DELETE FROM notification_preferences WHERE address = $1",
      [address]
    );
    return { deleted: result.rowCount > 0 };
  }

  _rowToPreferences(row) {
    return {
      address: row.address,
      channels: row.channels || { ...DEFAULT_PREFERENCES.channels },
      events: row.events || { ...DEFAULT_PREFERENCES.events },
      email: row.email || null,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    };
  }

  async close() {}
}
