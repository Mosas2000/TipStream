-- Migration: Add notification preferences table
-- Issue: #399
-- Description: Stores per-address notification channel and event-type preferences

CREATE TABLE IF NOT EXISTS notification_preferences (
  address TEXT PRIMARY KEY,
  channels JSONB NOT NULL DEFAULT '{"in_app": true, "email": false}',
  events JSONB NOT NULL DEFAULT '{"tip_received": true, "tip_sent": false, "scheduled_tip_executed": true, "scheduled_tip_failed": true, "refund_requested": true, "refund_resolved": true}',
  email TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notification_preferences_address_idx
  ON notification_preferences (address);
