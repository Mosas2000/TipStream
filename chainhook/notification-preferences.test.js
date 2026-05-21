import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  MemoryNotificationPreferencesStore,
  validatePreferencesPayload,
  mergePreferences,
  DEFAULT_PREFERENCES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EVENT_TYPES,
} from "./notification-preferences.js";

const VALID_ADDRESS = "SP1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE";
const OTHER_ADDRESS = "SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T";

describe("validatePreferencesPayload", () => {
  it("accepts an empty object", () => {
    const result = validatePreferencesPayload({});
    assert.equal(result.valid, true);
  });

  it("accepts valid channel toggles", () => {
    const result = validatePreferencesPayload({
      channels: { in_app: false, email: true },
    });
    assert.equal(result.valid, true);
  });

  it("accepts valid event toggles", () => {
    const result = validatePreferencesPayload({
      events: { tip_received: false, tip_sent: true },
    });
    assert.equal(result.valid, true);
  });

  it("accepts a valid email address", () => {
    const result = validatePreferencesPayload({ email: "user@example.com" });
    assert.equal(result.valid, true);
  });

  it("accepts null email to clear the address", () => {
    const result = validatePreferencesPayload({ email: null });
    assert.equal(result.valid, true);
  });

  it("rejects a non-object body", () => {
    const result = validatePreferencesPayload("bad");
    assert.equal(result.valid, false);
    assert.match(result.error, /object/);
  });

  it("rejects channels as an array", () => {
    const result = validatePreferencesPayload({ channels: [] });
    assert.equal(result.valid, false);
    assert.match(result.error, /channels/);
  });

  it("rejects an unknown channel key", () => {
    const result = validatePreferencesPayload({ channels: { sms: true } });
    assert.equal(result.valid, false);
    assert.match(result.error, /unknown channel/);
  });

  it("rejects a non-boolean channel value", () => {
    const result = validatePreferencesPayload({ channels: { in_app: "yes" } });
    assert.equal(result.valid, false);
    assert.match(result.error, /boolean/);
  });

  it("rejects an unknown event type", () => {
    const result = validatePreferencesPayload({ events: { unknown_event: true } });
    assert.equal(result.valid, false);
    assert.match(result.error, /unknown event type/);
  });

  it("rejects a non-boolean event value", () => {
    const result = validatePreferencesPayload({ events: { tip_received: 1 } });
    assert.equal(result.valid, false);
    assert.match(result.error, /boolean/);
  });

  it("rejects a malformed email", () => {
    const result = validatePreferencesPayload({ email: "not-an-email" });
    assert.equal(result.valid, false);
    assert.match(result.error, /email/);
  });

  it("rejects an email exceeding 254 characters", () => {
    const long = "a".repeat(250) + "@b.co";
    const result = validatePreferencesPayload({ email: long });
    assert.equal(result.valid, false);
    assert.match(result.error, /254/);
  });
});

describe("mergePreferences", () => {
  it("returns existing preferences unchanged when updates are empty", () => {
    const existing = { ...DEFAULT_PREFERENCES };
    const merged = mergePreferences(existing, {});
    assert.deepEqual(merged.channels, existing.channels);
    assert.deepEqual(merged.events, existing.events);
    assert.equal(merged.email, existing.email);
  });

  it("merges channel updates without overwriting untouched channels", () => {
    const existing = { ...DEFAULT_PREFERENCES };
    const merged = mergePreferences(existing, { channels: { email: true } });
    assert.equal(merged.channels.email, true);
    assert.equal(merged.channels.in_app, DEFAULT_PREFERENCES.channels.in_app);
  });

  it("merges event updates without overwriting untouched events", () => {
    const existing = { ...DEFAULT_PREFERENCES };
    const merged = mergePreferences(existing, { events: { tip_sent: true } });
    assert.equal(merged.events.tip_sent, true);
    assert.equal(merged.events.tip_received, DEFAULT_PREFERENCES.events.tip_received);
  });

  it("updates email when provided", () => {
    const existing = { ...DEFAULT_PREFERENCES };
    const merged = mergePreferences(existing, { email: "test@example.com" });
    assert.equal(merged.email, "test@example.com");
  });

  it("clears email when null is provided", () => {
    const existing = { ...DEFAULT_PREFERENCES, email: "old@example.com" };
    const merged = mergePreferences(existing, { email: null });
    assert.equal(merged.email, null);
  });

  it("does not mutate the existing object", () => {
    const existing = { ...DEFAULT_PREFERENCES };
    mergePreferences(existing, { channels: { email: true } });
    assert.equal(existing.channels.email, DEFAULT_PREFERENCES.channels.email);
  });
});

describe("MemoryNotificationPreferencesStore", () => {
  let store;

  before(async () => {
    store = new MemoryNotificationPreferencesStore();
    await store.init();
  });

  after(async () => {
    await store.close();
  });

  it("returns default preferences for an unknown address", async () => {
    const prefs = await store.getPreferences(VALID_ADDRESS);
    assert.equal(prefs.address, VALID_ADDRESS);
    assert.deepEqual(prefs.channels, DEFAULT_PREFERENCES.channels);
    assert.deepEqual(prefs.events, DEFAULT_PREFERENCES.events);
    assert.equal(prefs.email, null);
  });

  it("throws for an invalid address on get", async () => {
    await assert.rejects(() => store.getPreferences("bad-address"), /invalid address/);
  });

  it("throws for an invalid address on upsert", async () => {
    await assert.rejects(() => store.upsertPreferences("bad", {}), /invalid address/);
  });

  it("throws for an invalid address on delete", async () => {
    await assert.rejects(() => store.deletePreferences("bad"), /invalid address/);
  });

  it("persists preferences after upsert", async () => {
    await store.upsertPreferences(VALID_ADDRESS, {
      channels: { email: true },
      email: "user@example.com",
    });
    const prefs = await store.getPreferences(VALID_ADDRESS);
    assert.equal(prefs.channels.email, true);
    assert.equal(prefs.email, "user@example.com");
  });

  it("merges partial updates without losing existing values", async () => {
    await store.upsertPreferences(VALID_ADDRESS, { channels: { in_app: false } });
    const prefs = await store.getPreferences(VALID_ADDRESS);
    assert.equal(prefs.channels.in_app, false);
    assert.equal(prefs.channels.email, true);
  });

  it("stores preferences independently per address", async () => {
    await store.upsertPreferences(OTHER_ADDRESS, { channels: { email: true } });
    const a = await store.getPreferences(VALID_ADDRESS);
    const b = await store.getPreferences(OTHER_ADDRESS);
    assert.equal(a.channels.in_app, false);
    assert.equal(b.channels.in_app, DEFAULT_PREFERENCES.channels.in_app);
  });

  it("deletes preferences and returns deleted: true", async () => {
    await store.upsertPreferences(VALID_ADDRESS, { email: "del@example.com" });
    const result = await store.deletePreferences(VALID_ADDRESS);
    assert.equal(result.deleted, true);
    const prefs = await store.getPreferences(VALID_ADDRESS);
    assert.equal(prefs.email, null);
  });

  it("returns deleted: false when address had no stored preferences", async () => {
    const fresh = "SP2DEMOADDRESS0000000000000000000000ABCDEF";
    const result = await store.deletePreferences(fresh);
    assert.equal(result.deleted, false);
  });

  it("upsert returns the merged record with updatedAt", async () => {
    const record = await store.upsertPreferences(OTHER_ADDRESS, {
      events: { tip_sent: true },
    });
    assert.ok(record.updatedAt);
    assert.equal(record.events.tip_sent, true);
  });
});
