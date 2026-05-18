import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRefundStore, REFUND_STATUSES, createRefundStore } from './storage.js';

function makeRefundRequest(overrides = {}) {
  return {
    tipId: 'tip-42',
    txId: '0xabc123def456',
    sender: 'SP1SENDER000000000000000000000000000',
    recipient: 'SP2RECIPIENT0000000000000000000000',
    amount: 95000,
    status: REFUND_STATUSES.PENDING,
    reason: 'sent to wrong address',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('MemoryRefundStore', () => {
  let store;

  beforeEach(() => {
    store = new MemoryRefundStore();
  });

  it('inserts a new refund request', async () => {
    const request = makeRefundRequest();
    const result = await store.insertRefundRequest(request);

    assert.strictEqual(result.inserted, true);
    assert.strictEqual(result.request.tipId, 'tip-42');
    assert.strictEqual(result.request.status, REFUND_STATUSES.PENDING);
  });

  it('rejects duplicate refund request for same tipId', async () => {
    const request = makeRefundRequest();
    await store.insertRefundRequest(request);

    const duplicate = makeRefundRequest({ reason: 'different reason' });
    const result = await store.insertRefundRequest(duplicate);

    assert.strictEqual(result.inserted, false);
    assert.strictEqual(result.request.reason, 'sent to wrong address');
  });

  it('retrieves a refund request by tipId', async () => {
    const request = makeRefundRequest();
    await store.insertRefundRequest(request);

    const found = await store.getRefundRequest('tip-42');
    assert.ok(found);
    assert.strictEqual(found.tipId, 'tip-42');
    assert.strictEqual(found.sender, request.sender);
    assert.strictEqual(found.recipient, request.recipient);
    assert.strictEqual(found.amount, 95000);
  });

  it('returns null for non-existent tipId', async () => {
    const found = await store.getRefundRequest('tip-999');
    assert.strictEqual(found, null);
  });

  it('lists all refund requests', async () => {
    await store.insertRefundRequest(makeRefundRequest({ tipId: 'tip-1' }));
    await store.insertRefundRequest(makeRefundRequest({ tipId: 'tip-2' }));

    const result = await store.listRefundRequests();
    assert.strictEqual(result.total, 2);
    assert.strictEqual(result.requests.length, 2);
  });

  it('filters by sender', async () => {
    await store.insertRefundRequest(makeRefundRequest({ tipId: 'tip-1', sender: 'SPAAAA' }));
    await store.insertRefundRequest(makeRefundRequest({ tipId: 'tip-2', sender: 'SPBBBB' }));

    const result = await store.listRefundRequests({ sender: 'SPAAAA' });
    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.requests[0].sender, 'SPAAAA');
  });

  it('filters by recipient', async () => {
    await store.insertRefundRequest(makeRefundRequest({ tipId: 'tip-1', recipient: 'SPRECIP1' }));
    await store.insertRefundRequest(makeRefundRequest({ tipId: 'tip-2', recipient: 'SPRECIP2' }));

    const result = await store.listRefundRequests({ recipient: 'SPRECIP2' });
    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.requests[0].recipient, 'SPRECIP2');
  });

  it('filters by status', async () => {
    await store.insertRefundRequest(makeRefundRequest({ tipId: 'tip-1', status: REFUND_STATUSES.PENDING }));
    await store.insertRefundRequest(makeRefundRequest({ tipId: 'tip-2', status: REFUND_STATUSES.APPROVED }));
    await store.insertRefundRequest(makeRefundRequest({ tipId: 'tip-3', status: REFUND_STATUSES.REJECTED }));

    const pending = await store.listRefundRequests({ status: REFUND_STATUSES.PENDING });
    assert.strictEqual(pending.total, 1);

    const approved = await store.listRefundRequests({ status: REFUND_STATUSES.APPROVED });
    assert.strictEqual(approved.total, 1);
  });

  it('respects limit and offset', async () => {
    for (let i = 1; i <= 5; i++) {
      await store.insertRefundRequest(makeRefundRequest({ tipId: `tip-${i}` }));
    }

    const page1 = await store.listRefundRequests({ limit: 2, offset: 0 });
    assert.strictEqual(page1.requests.length, 2);
    assert.strictEqual(page1.total, 5);

    const page2 = await store.listRefundRequests({ limit: 2, offset: 2 });
    assert.strictEqual(page2.requests.length, 2);
    assert.strictEqual(page2.total, 5);
  });

  it('updates a refund request status to approved', async () => {
    await store.insertRefundRequest(makeRefundRequest());

    const result = await store.updateRefundRequest('tip-42', {
      status: REFUND_STATUSES.APPROVED,
      resolvedAt: new Date(),
      refundTxId: '0xrefundtx',
    });

    assert.strictEqual(result.updated, true);
    assert.strictEqual(result.request.status, REFUND_STATUSES.APPROVED);
    assert.strictEqual(result.request.refundTxId, '0xrefundtx');
    assert.ok(result.request.resolvedAt);
  });

  it('updates a refund request status to rejected', async () => {
    await store.insertRefundRequest(makeRefundRequest());

    const result = await store.updateRefundRequest('tip-42', {
      status: REFUND_STATUSES.REJECTED,
      resolvedAt: new Date(),
    });

    assert.strictEqual(result.updated, true);
    assert.strictEqual(result.request.status, REFUND_STATUSES.REJECTED);
  });

  it('returns updated false for non-existent tipId', async () => {
    const result = await store.updateRefundRequest('tip-999', {
      status: REFUND_STATUSES.APPROVED,
    });

    assert.strictEqual(result.updated, false);
    assert.strictEqual(result.request, null);
  });
});

describe('REFUND_STATUSES', () => {
  it('defines expected status values', () => {
    assert.strictEqual(REFUND_STATUSES.PENDING, 'pending');
    assert.strictEqual(REFUND_STATUSES.APPROVED, 'approved');
    assert.strictEqual(REFUND_STATUSES.REJECTED, 'rejected');
  });
});

describe('createRefundStore', () => {
  it('creates a memory store when mode is memory', async () => {
    const store = await createRefundStore({ mode: 'memory' });
    assert.ok(store instanceof MemoryRefundStore);
  });

  it('memory store init returns self', async () => {
    const store = new MemoryRefundStore();
    const result = await store.init();
    assert.strictEqual(result, store);
  });

  it('memory store close resolves without error', async () => {
    const store = new MemoryRefundStore();
    await assert.doesNotReject(() => store.close());
  });
});
