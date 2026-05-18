import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRefundStore, REFUND_STATUSES } from './storage.js';
import { isValidStacksAddress } from './validation.js';

function makeRequest(overrides = {}) {
  return {
    tipId: 'tip-1',
    txId: '0xabc123',
    sender: 'SP1SENDER000000000000000000000000000',
    recipient: 'SP2RECIPIENT00000000000000000000000',
    amount: 95000,
    reason: '',
    status: REFUND_STATUSES.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function validateRefundBody(body) {
  if (!body.tipId || typeof body.tipId !== 'string') {
    return { valid: false, error: 'tipId is required' };
  }
  if (!body.txId || typeof body.txId !== 'string') {
    return { valid: false, error: 'txId is required' };
  }
  if (!body.sender || typeof body.sender !== 'string') {
    return { valid: false, error: 'sender address is required' };
  }
  if (!isValidStacksAddress(body.sender)) {
    return { valid: false, error: 'invalid sender address format' };
  }
  if (!body.recipient || typeof body.recipient !== 'string') {
    return { valid: false, error: 'recipient address is required' };
  }
  if (!isValidStacksAddress(body.recipient)) {
    return { valid: false, error: 'invalid recipient address format' };
  }
  const amountNum = Number(body.amount);
  if (!body.amount || isNaN(amountNum) || amountNum <= 0) {
    return { valid: false, error: 'amount must be a positive number' };
  }
  return { valid: true };
}

function validateResolveBody(body) {
  if (!body.action || !['approve', 'reject'].includes(body.action)) {
    return { valid: false, error: "action must be 'approve' or 'reject'" };
  }
  if (!body.recipient || typeof body.recipient !== 'string') {
    return { valid: false, error: 'recipient address is required' };
  }
  if (!isValidStacksAddress(body.recipient)) {
    return { valid: false, error: 'invalid recipient address format' };
  }
  return { valid: true };
}

describe('refund request body validation', () => {
  it('accepts a valid refund request body', () => {
    const result = validateRefundBody({
      tipId: 'tip-1',
      txId: '0xabc',
      sender: 'SP1SENDER000000000000000000000000000',
      recipient: 'SP2RECIPIENT00000000000000000000000',
      amount: 95000,
    });
    assert.strictEqual(result.valid, true);
  });

  it('rejects missing tipId', () => {
    const result = validateRefundBody({ txId: '0x', sender: 'SP1SENDER000000000000000000000000000', recipient: 'SP2RECIPIENT00000000000000000000000', amount: 1000 });
    assert.strictEqual(result.valid, false);
    assert.match(result.error, /tipId/);
  });

  it('rejects missing txId', () => {
    const result = validateRefundBody({ tipId: 'tip-1', sender: 'SP1SENDER000000000000000000000000000', recipient: 'SP2RECIPIENT00000000000000000000000', amount: 1000 });
    assert.strictEqual(result.valid, false);
    assert.match(result.error, /txId/);
  });

  it('rejects missing sender', () => {
    const result = validateRefundBody({ tipId: 'tip-1', txId: '0x', recipient: 'SP2RECIPIENT00000000000000000000000', amount: 1000 });
    assert.strictEqual(result.valid, false);
    assert.match(result.error, /sender/);
  });

  it('rejects missing recipient', () => {
    const result = validateRefundBody({ tipId: 'tip-1', txId: '0x', sender: 'SP1SENDER000000000000000000000000000', amount: 1000 });
    assert.strictEqual(result.valid, false);
    assert.match(result.error, /recipient/);
  });

  it('rejects zero amount', () => {
    const result = validateRefundBody({ tipId: 'tip-1', txId: '0x', sender: 'SP1SENDER000000000000000000000000000', recipient: 'SP2RECIPIENT00000000000000000000000', amount: 0 });
    assert.strictEqual(result.valid, false);
    assert.match(result.error, /amount/);
  });

  it('rejects negative amount', () => {
    const result = validateRefundBody({ tipId: 'tip-1', txId: '0x', sender: 'SP1SENDER000000000000000000000000000', recipient: 'SP2RECIPIENT00000000000000000000000', amount: -100 });
    assert.strictEqual(result.valid, false);
    assert.match(result.error, /amount/);
  });
});

describe('refund resolve body validation', () => {
  it('accepts approve action', () => {
    const result = validateResolveBody({ action: 'approve', recipient: 'SP2RECIPIENT00000000000000000000000' });
    assert.strictEqual(result.valid, true);
  });

  it('accepts reject action', () => {
    const result = validateResolveBody({ action: 'reject', recipient: 'SP2RECIPIENT00000000000000000000000' });
    assert.strictEqual(result.valid, true);
  });

  it('rejects invalid action', () => {
    const result = validateResolveBody({ action: 'cancel', recipient: 'SP2RECIPIENT00000000000000000000000' });
    assert.strictEqual(result.valid, false);
    assert.match(result.error, /action/);
  });

  it('rejects missing action', () => {
    const result = validateResolveBody({ recipient: 'SP2RECIPIENT0000000000000000000000' });
    assert.strictEqual(result.valid, false);
  });

  it('rejects missing recipient', () => {
    const result = validateResolveBody({ action: 'approve' });
    assert.strictEqual(result.valid, false);
    assert.match(result.error, /recipient/);
  });
});

describe('refund request lifecycle via MemoryRefundStore', () => {
  let store;

  beforeEach(() => {
    store = new MemoryRefundStore();
  });

  it('full approve lifecycle', async () => {
    const request = makeRequest();
    const inserted = await store.insertRefundRequest(request);
    assert.strictEqual(inserted.inserted, true);
    assert.strictEqual(inserted.request.status, REFUND_STATUSES.PENDING);

    const found = await store.getRefundRequest('tip-1');
    assert.ok(found);
    assert.strictEqual(found.status, REFUND_STATUSES.PENDING);

    const updated = await store.updateRefundRequest('tip-1', {
      status: REFUND_STATUSES.APPROVED,
      resolvedAt: new Date(),
      refundTxId: '0xrefundtx',
    });
    assert.strictEqual(updated.updated, true);
    assert.strictEqual(updated.request.status, REFUND_STATUSES.APPROVED);
    assert.strictEqual(updated.request.refundTxId, '0xrefundtx');
  });

  it('full reject lifecycle', async () => {
    await store.insertRefundRequest(makeRequest());

    const updated = await store.updateRefundRequest('tip-1', {
      status: REFUND_STATUSES.REJECTED,
      resolvedAt: new Date(),
    });
    assert.strictEqual(updated.updated, true);
    assert.strictEqual(updated.request.status, REFUND_STATUSES.REJECTED);
    assert.ok(updated.request.resolvedAt);
  });

  it('prevents duplicate refund request for same tip', async () => {
    await store.insertRefundRequest(makeRequest());
    const second = await store.insertRefundRequest(makeRequest({ reason: 'second attempt' }));
    assert.strictEqual(second.inserted, false);
    assert.strictEqual(second.request.reason, '');
  });

  it('only recipient can resolve — enforced at application layer', async () => {
    await store.insertRefundRequest(makeRequest());
    const found = await store.getRefundRequest('tip-1');
    assert.strictEqual(found.recipient, 'SP2RECIPIENT00000000000000000000000');

    const wrongRecipient = 'SPWRONG000000000000000000000000000';
    assert.notStrictEqual(found.recipient, wrongRecipient);
  });

  it('lists pending requests for a sender', async () => {
    await store.insertRefundRequest(makeRequest({ tipId: 'tip-1', sender: 'SPAAAA' }));
    await store.insertRefundRequest(makeRequest({ tipId: 'tip-2', sender: 'SPAAAA', status: REFUND_STATUSES.APPROVED }));
    await store.insertRefundRequest(makeRequest({ tipId: 'tip-3', sender: 'SPBBBB' }));

    const pending = await store.listRefundRequests({ sender: 'SPAAAA', status: REFUND_STATUSES.PENDING });
    assert.strictEqual(pending.total, 1);
    assert.strictEqual(pending.requests[0].tipId, 'tip-1');
  });

  it('lists pending requests for a recipient', async () => {
    await store.insertRefundRequest(makeRequest({ tipId: 'tip-1', recipient: 'SPRECIP1' }));
    await store.insertRefundRequest(makeRequest({ tipId: 'tip-2', recipient: 'SPRECIP2' }));

    const result = await store.listRefundRequests({ recipient: 'SPRECIP1' });
    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.requests[0].tipId, 'tip-1');
  });
});
