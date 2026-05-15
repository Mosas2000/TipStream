import { test } from 'node:test';
import assert from 'node:assert';
import { MemoryScheduledTipStore } from './storage.js';

test('MemoryScheduledTipStore inserts scheduled tip', async () => {
  const store = new MemoryScheduledTipStore();
  await store.init();

  const tip = {
    id: 'test-id-1',
    sender: 'SP2J6Z...ABC',
    recipient: 'SP3K5...XYZ',
    amount: 1000000,
    scheduledFor: new Date(Date.now() + 3600000),
    message: 'Test tip',
    category: 1,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await store.insertScheduledTip(tip);

  assert.strictEqual(result.inserted, true);
  assert.strictEqual(result.tip.id, 'test-id-1');
});

test('MemoryScheduledTipStore prevents duplicate inserts', async () => {
  const store = new MemoryScheduledTipStore();
  await store.init();

  const tip = {
    id: 'test-id-1',
    sender: 'SP2J6Z...ABC',
    recipient: 'SP3K5...XYZ',
    amount: 1000000,
    scheduledFor: new Date(Date.now() + 3600000),
    status: 'pending',
  };

  await store.insertScheduledTip(tip);
  const result = await store.insertScheduledTip(tip);

  assert.strictEqual(result.inserted, false);
});

test('MemoryScheduledTipStore gets scheduled tip by id', async () => {
  const store = new MemoryScheduledTipStore();
  await store.init();

  const tip = {
    id: 'test-id-1',
    sender: 'SP2J6Z...ABC',
    recipient: 'SP3K5...XYZ',
    amount: 1000000,
    scheduledFor: new Date(Date.now() + 3600000),
    status: 'pending',
  };

  await store.insertScheduledTip(tip);
  const retrieved = await store.getScheduledTip('test-id-1');

  assert.strictEqual(retrieved.id, 'test-id-1');
  assert.strictEqual(retrieved.sender, 'SP2J6Z...ABC');
});

test('MemoryScheduledTipStore returns null for non-existent tip', async () => {
  const store = new MemoryScheduledTipStore();
  await store.init();

  const retrieved = await store.getScheduledTip('non-existent');

  assert.strictEqual(retrieved, null);
});

test('MemoryScheduledTipStore lists scheduled tips with filters', async () => {
  const store = new MemoryScheduledTipStore();
  await store.init();

  await store.insertScheduledTip({
    id: 'tip-1',
    sender: 'SP2J6Z...ABC',
    recipient: 'SP3K5...XYZ',
    amount: 1000000,
    scheduledFor: new Date(Date.now() + 3600000),
    status: 'pending',
  });

  await store.insertScheduledTip({
    id: 'tip-2',
    sender: 'SP2J6Z...ABC',
    recipient: 'SP4L7...DEF',
    amount: 2000000,
    scheduledFor: new Date(Date.now() + 7200000),
    status: 'executed',
  });

  const allTips = await store.listScheduledTips({});
  assert.strictEqual(allTips.tips.length, 2);
  assert.strictEqual(allTips.total, 2);

  const pendingTips = await store.listScheduledTips({ status: 'pending' });
  assert.strictEqual(pendingTips.tips.length, 1);
  assert.strictEqual(pendingTips.tips[0].id, 'tip-1');

  const senderTips = await store.listScheduledTips({ sender: 'SP2J6Z...ABC' });
  assert.strictEqual(senderTips.tips.length, 2);
});

test('MemoryScheduledTipStore updates scheduled tip', async () => {
  const store = new MemoryScheduledTipStore();
  await store.init();

  await store.insertScheduledTip({
    id: 'tip-1',
    sender: 'SP2J6Z...ABC',
    recipient: 'SP3K5...XYZ',
    amount: 1000000,
    scheduledFor: new Date(Date.now() + 3600000),
    status: 'pending',
  });

  const result = await store.updateScheduledTip('tip-1', {
    status: 'executed',
    txId: '0xabc123',
    executedAt: new Date(),
  });

  assert.strictEqual(result.updated, true);
  assert.strictEqual(result.tip.status, 'executed');
  assert.strictEqual(result.tip.txId, '0xabc123');
});

test('MemoryScheduledTipStore cancels scheduled tip', async () => {
  const store = new MemoryScheduledTipStore();
  await store.init();

  await store.insertScheduledTip({
    id: 'tip-1',
    sender: 'SP2J6Z...ABC',
    recipient: 'SP3K5...XYZ',
    amount: 1000000,
    scheduledFor: new Date(Date.now() + 3600000),
    status: 'pending',
  });

  const result = await store.cancelScheduledTip('tip-1', 'SP2J6Z...ABC');

  assert.strictEqual(result.cancelled, true);
  assert.strictEqual(result.tip.status, 'cancelled');
});

test('MemoryScheduledTipStore prevents cancelling non-pending tip', async () => {
  const store = new MemoryScheduledTipStore();
  await store.init();

  await store.insertScheduledTip({
    id: 'tip-1',
    sender: 'SP2J6Z...ABC',
    recipient: 'SP3K5...XYZ',
    amount: 1000000,
    scheduledFor: new Date(Date.now() + 3600000),
    status: 'executed',
  });

  const result = await store.cancelScheduledTip('tip-1', 'SP2J6Z...ABC');

  assert.strictEqual(result.cancelled, false);
  assert.strictEqual(result.reason, 'not_pending');
});

test('MemoryScheduledTipStore prevents cancelling by wrong sender', async () => {
  const store = new MemoryScheduledTipStore();
  await store.init();

  await store.insertScheduledTip({
    id: 'tip-1',
    sender: 'SP2J6Z...ABC',
    recipient: 'SP3K5...XYZ',
    amount: 1000000,
    scheduledFor: new Date(Date.now() + 3600000),
    status: 'pending',
  });

  const result = await store.cancelScheduledTip('tip-1', 'SP4L7...DEF');

  assert.strictEqual(result.cancelled, false);
  assert.strictEqual(result.reason, 'not_found');
});

test('MemoryScheduledTipStore gets pending scheduled tips', async () => {
  const store = new MemoryScheduledTipStore();
  await store.init();

  await store.insertScheduledTip({
    id: 'tip-1',
    sender: 'SP2J6Z...ABC',
    recipient: 'SP3K5...XYZ',
    amount: 1000000,
    scheduledFor: new Date(Date.now() - 1000),
    status: 'pending',
  });

  await store.insertScheduledTip({
    id: 'tip-2',
    sender: 'SP2J6Z...ABC',
    recipient: 'SP4L7...DEF',
    amount: 2000000,
    scheduledFor: new Date(Date.now() + 3600000),
    status: 'pending',
  });

  const pendingTips = await store.getPendingScheduledTips();

  assert.strictEqual(pendingTips.length, 1);
  assert.strictEqual(pendingTips[0].id, 'tip-1');
});

test('MemoryScheduledTipStore gets notifiable scheduled tips', async () => {
  const store = new MemoryScheduledTipStore();
  await store.init();

  const now = Date.now();
  const notificationTime = now + 30 * 60 * 1000;

  await store.insertScheduledTip({
    id: 'tip-1',
    sender: 'SP2J6Z...ABC',
    recipient: 'SP3K5...XYZ',
    amount: 1000000,
    scheduledFor: new Date(notificationTime),
    status: 'pending',
    notifiedAt: null,
  });

  await store.insertScheduledTip({
    id: 'tip-2',
    sender: 'SP2J6Z...ABC',
    recipient: 'SP4L7...DEF',
    amount: 2000000,
    scheduledFor: new Date(now + 120 * 60 * 1000),
    status: 'pending',
    notifiedAt: null,
  });

  const notifiableTips = await store.getNotifiableScheduledTips(60);

  assert.strictEqual(notifiableTips.length, 1);
  assert.strictEqual(notifiableTips[0].id, 'tip-1');
});

test('MemoryScheduledTipStore counts scheduled tips', async () => {
  const store = new MemoryScheduledTipStore();
  await store.init();

  await store.insertScheduledTip({
    id: 'tip-1',
    sender: 'SP2J6Z...ABC',
    recipient: 'SP3K5...XYZ',
    amount: 1000000,
    scheduledFor: new Date(Date.now() + 3600000),
    status: 'pending',
  });

  await store.insertScheduledTip({
    id: 'tip-2',
    sender: 'SP2J6Z...ABC',
    recipient: 'SP4L7...DEF',
    amount: 2000000,
    scheduledFor: new Date(Date.now() + 7200000),
    status: 'executed',
  });

  const totalCount = await store.countScheduledTips();
  assert.strictEqual(totalCount, 2);

  const pendingCount = await store.countScheduledTips('pending');
  assert.strictEqual(pendingCount, 1);

  const executedCount = await store.countScheduledTips('executed');
  assert.strictEqual(executedCount, 1);
});
