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

-- Standard indexes for common queries
CREATE INDEX IF NOT EXISTS chainhook_events_tx_id_idx ON chainhook_events (tx_id);
CREATE INDEX IF NOT EXISTS chainhook_events_block_height_idx ON chainhook_events (block_height DESC);
CREATE INDEX IF NOT EXISTS chainhook_events_contract_idx ON chainhook_events (contract);
CREATE INDEX IF NOT EXISTS chainhook_events_ingested_at_idx ON chainhook_events (ingested_at DESC);

-- JSONB indexes for user tip lookup optimization (Issue #385)
-- These partial indexes enable fast O(log n) lookups for /api/tips/user/:address
CREATE INDEX IF NOT EXISTS chainhook_events_sender_idx ON chainhook_events ((raw_event->'event'->>'sender')) WHERE event_type = 'tip-sent';
CREATE INDEX IF NOT EXISTS chainhook_events_recipient_idx ON chainhook_events ((raw_event->'event'->>'recipient')) WHERE event_type = 'tip-sent';

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

CREATE INDEX IF NOT EXISTS scheduled_tips_sender_idx ON scheduled_tips (sender);
CREATE INDEX IF NOT EXISTS scheduled_tips_recipient_idx ON scheduled_tips (recipient);
CREATE INDEX IF NOT EXISTS scheduled_tips_status_idx ON scheduled_tips (status);
CREATE INDEX IF NOT EXISTS scheduled_tips_scheduled_for_idx ON scheduled_tips (scheduled_for);
CREATE INDEX IF NOT EXISTS scheduled_tips_pending_due_idx ON scheduled_tips (scheduled_for) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS refund_requests (
  tip_id TEXT PRIMARY KEY,
  tx_id TEXT NOT NULL DEFAULT '',
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  amount BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  refund_tx_id TEXT
);

CREATE INDEX IF NOT EXISTS refund_requests_sender_idx ON refund_requests (sender);
CREATE INDEX IF NOT EXISTS refund_requests_recipient_idx ON refund_requests (recipient);
CREATE INDEX IF NOT EXISTS refund_requests_status_idx ON refund_requests (status);
