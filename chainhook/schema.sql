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

CREATE INDEX IF NOT EXISTS chainhook_events_tx_id_idx ON chainhook_events (tx_id);
CREATE INDEX IF NOT EXISTS chainhook_events_block_height_idx ON chainhook_events (block_height DESC);
CREATE INDEX IF NOT EXISTS chainhook_events_contract_idx ON chainhook_events (contract);
CREATE INDEX IF NOT EXISTS chainhook_events_ingested_at_idx ON chainhook_events (ingested_at DESC);
