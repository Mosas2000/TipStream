import { test } from 'node:test';
import assert from 'node:assert';
import { ScheduledTip, validateScheduledTipParams, validateScheduledTime, SCHEDULED_TIP_STATUSES, MIN_SCHEDULE_MINUTES, MAX_SCHEDULE_DAYS } from './scheduler.js';

test('ScheduledTip creates with default values', () => {
  const tip = new ScheduledTip({
    sender: 'SP2J6Z...ABC',
    recipient: 'SP3K5...XYZ',
    amount: 1000000,
    scheduledFor: new Date(Date.now() + 3600000).toISOString(),
  });

  assert.ok(tip.id);
  assert.strictEqual(tip.sender, 'SP2J6Z...ABC');
  assert.strictEqual(tip.recipient, 'SP3K5...XYZ');
  assert.strictEqual(tip.amount, 1000000);
  assert.strictEqual(tip.status, SCHEDULED_TIP_STATUSES.PENDING);
  assert.strictEqual(tip.message, '');
  assert.strictEqual(tip.category, 0);
  assert.ok(tip.createdAt);
  assert.ok(tip.updatedAt);
  assert.strictEqual(tip.executedAt, null);
  assert.strictEqual(tip.txId, null);
  assert.strictEqual(tip.failureReason, null);
});

test('ScheduledTip.toJSON returns expected structure', () => {
  const tip = new ScheduledTip({
    sender: 'SP2J6Z...ABC',
    recipient: 'SP3K5...XYZ',
    amount: 1000000,
    scheduledFor: new Date(Date.now() + 3600000).toISOString(),
  });

  const json = tip.toJSON();

  assert.strictEqual(typeof json.id, 'string');
  assert.strictEqual(json.sender, 'SP2J6Z...ABC');
  assert.strictEqual(json.recipient, 'SP3K5...XYZ');
  assert.strictEqual(json.amount, 1000000);
  assert.strictEqual(json.status, 'pending');
});

test('ScheduledTip.isPending returns true for pending status', () => {
  const tip = new ScheduledTip({
    sender: 'SP2J6Z...ABC',
    recipient: 'SP3K5...XYZ',
    amount: 1000000,
    scheduledFor: new Date(Date.now() + 3600000).toISOString(),
    status: SCHEDULED_TIP_STATUSES.PENDING,
  });

  assert.strictEqual(tip.isPending(), true);
});

test('ScheduledTip.isPending returns false for non-pending status', () => {
  const tip = new ScheduledTip({
    sender: 'SP2J6Z...ABC',
    recipient: 'SP3K5...XYZ',
    amount: 1000000,
    scheduledFor: new Date(Date.now() + 3600000).toISOString(),
    status: SCHEDULED_TIP_STATUSES.EXECUTED,
  });

  assert.strictEqual(tip.isPending(), false);
});

test('ScheduledTip.isExecutable returns true when scheduled time has passed', () => {
  const tip = new ScheduledTip({
    sender: 'SP2J6Z...ABC',
    recipient: 'SP3K5...XYZ',
    amount: 1000000,
    scheduledFor: new Date(Date.now() - 1000).toISOString(),
    status: SCHEDULED_TIP_STATUSES.PENDING,
  });

  assert.strictEqual(tip.isExecutable(), true);
});

test('ScheduledTip.isExecutable returns false when scheduled time has not passed', () => {
  const tip = new ScheduledTip({
    sender: 'SP2J6Z...ABC',
    recipient: 'SP3K5...XYZ',
    amount: 1000000,
    scheduledFor: new Date(Date.now() + 3600000).toISOString(),
    status: SCHEDULED_TIP_STATUSES.PENDING,
  });

  assert.strictEqual(tip.isExecutable(), false);
});

test('validateScheduledTime rejects past dates', () => {
  const pastDate = new Date(Date.now() - 3600000).toISOString();
  const result = validateScheduledTime(pastDate);

  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('at least'));
});

test('validateScheduledTime accepts future dates', () => {
  const futureDate = new Date(Date.now() + (MIN_SCHEDULE_MINUTES + 5) * 60 * 1000).toISOString();
  const result = validateScheduledTime(futureDate);

  assert.strictEqual(result.valid, true);
});

test('validateScheduledTime rejects dates too far in the future', () => {
  const farFutureDate = new Date(Date.now() + (MAX_SCHEDULE_DAYS + 10) * 24 * 60 * 60 * 1000).toISOString();
  const result = validateScheduledTime(farFutureDate);

  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('cannot be more than'));
});

test('validateScheduledTime rejects invalid date format', () => {
  const result = validateScheduledTime('not-a-date');

  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.error, 'Invalid scheduled date format');
});

test('validateScheduledTipParams validates required fields', () => {
  const result = validateScheduledTipParams({});

  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.error, 'Sender address is required');
});

test('validateScheduledTipParams rejects sender equals recipient', () => {
  const result = validateScheduledTipParams({
    sender: 'SP2J6Z...ABC',
    recipient: 'SP2J6Z...ABC',
    amount: 1000000,
    scheduledFor: new Date(Date.now() + 3600000).toISOString(),
  });

  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.error, 'Cannot schedule a tip to yourself');
});

test('validateScheduledTipParams validates amount', () => {
  const result = validateScheduledTipParams({
    sender: 'SP2J6Z...ABC',
    recipient: 'SP3K5...XYZ',
    amount: -100,
    scheduledFor: new Date(Date.now() + 3600000).toISOString(),
  });

  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('positive number'));
});

test('validateScheduledTipParams validates minimum amount', () => {
  const result = validateScheduledTipParams({
    sender: 'SP2J6Z...ABC',
    recipient: 'SP3K5...XYZ',
    amount: 100,
    scheduledFor: new Date(Date.now() + 3600000).toISOString(),
  });

  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('Minimum tip'));
});

test('validateScheduledTipParams validates message length', () => {
  const longMessage = 'a'.repeat(281);
  const result = validateScheduledTipParams({
    sender: 'SP2J6Z...ABC',
    recipient: 'SP3K5...XYZ',
    amount: 1000000,
    scheduledFor: new Date(Date.now() + 3600000).toISOString(),
    message: longMessage,
  });

  assert.strictEqual(result.valid, false);
  assert.ok(result.error.includes('280 characters'));
});

test('validateScheduledTipParams accepts valid params', () => {
  const result = validateScheduledTipParams({
    sender: 'SP2J6Z...ABC',
    recipient: 'SP3K5...XYZ',
    amount: 1000000,
    scheduledFor: new Date(Date.now() + (MIN_SCHEDULE_MINUTES + 5) * 60 * 1000).toISOString(),
    message: 'Test message',
    category: 1,
  });

  assert.strictEqual(result.valid, true);
});
