import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NODE_ENV = 'test';

const { server } = await import('./server.js');

function request({ method, path, body, headers = {} }) {
  return new Promise((resolve, reject) => {
    const payload = typeof body === 'string' ? body : body ? JSON.stringify(body) : '';
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: server.address().port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, body: parsed, headers: res.headers });
        });
      },
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function samplePayload() {
  return {
    apply: [
      {
        block_identifier: { index: 101 },
        timestamp: 1700000000000,
        transactions: [
          {
            transaction_identifier: { hash: '0xabc123' },
            metadata: {
              receipt: {
                events: [
                  {
                    type: 'SmartContractEvent',
                    data: {
                      contract_identifier: 'SP123.tipstream',
                      value: {
                        event: 'tip-sent',
                        'tip-id': 1,
                        sender: 'SP1SENDER',
                        recipient: 'SP2RECIPIENT',
                        amount: 100000,
                        fee: 5000,
                        'net-amount': 95000,
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    ],
  };
}

function buildEventPayload(events, blockHeight, timestamp) {
  return {
    apply: [
      {
        block_identifier: { index: blockHeight },
        timestamp,
        transactions: events.map((event) => ({
          transaction_identifier: { hash: event.txId },
          metadata: {
            receipt: {
              events: [event.payload],
            },
          },
        })),
      },
    ],
  };
}

function buildTipEvent({ txId, tipId, sender, recipient, amount, fee, netAmount }) {
  return {
    txId,
    payload: {
      type: 'SmartContractEvent',
      data: {
        contract_identifier: 'SP123.tipstream',
        value: {
          event: 'tip-sent',
          'tip-id': tipId,
          sender,
          recipient,
          amount,
          fee,
          'net-amount': netAmount,
        },
      },
    },
  };
}

function buildAdminEvent({ txId, eventType, data }) {
  return {
    txId,
    payload: {
      type: 'print_event',
      data: {
        contract_identifier: 'SP123.tipstream-admin',
        value: {
          event: eventType,
          ...data,
        },
      },
    },
  };
}

before(async () => {
  await new Promise((resolve) => server.listen(0, resolve));
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('chainhook server integration', () => {
  it('ingests events and serves them back through the API', async () => {
    const ingest = await request({
      method: 'POST',
      path: '/api/chainhook/events',
      body: samplePayload(),
    });

    assert.strictEqual(ingest.status, 200);
    assert.strictEqual(ingest.body.ok, true);
    assert.strictEqual(ingest.body.indexed, 1);
    assert.strictEqual(ingest.body.duplicates, 0);
    assert.ok(ingest.headers['x-request-id']);

    const tips = await request({
      method: 'GET',
      path: '/api/tips?limit=10',
    });

    assert.strictEqual(tips.status, 200);
    assert.strictEqual(tips.body.total, 1);
    assert.strictEqual(tips.body.tips[0].tipId, '1');
    assert.strictEqual(tips.body.tips[0].sender, 'SP1SENDER');

    const duplicate = await request({
      method: 'POST',
      path: '/api/chainhook/events',
      body: samplePayload(),
    });

    assert.strictEqual(duplicate.status, 200);
    assert.strictEqual(duplicate.body.indexed, 0);
    assert.strictEqual(duplicate.body.duplicates, 1);

    const metrics = await request({
      method: 'GET',
      path: '/metrics',
    });

    assert.strictEqual(metrics.status, 200);
    assert.strictEqual(metrics.body.storage.storage_mode, 'memory');
    assert.ok(metrics.body.events_indexed >= 1);
  });

  it('covers the remaining chainhook API routes', async () => {
    const sender = 'SPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const recipient = 'SPBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
    const secondaryRecipient = 'SPCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';

    const ingest = await request({
      method: 'POST',
      path: '/api/chainhook/events',
      body: buildEventPayload([
        buildTipEvent({
          txId: '0xroute-tip-1',
          tipId: 201,
          sender,
          recipient,
          amount: 125000,
          fee: 5000,
          netAmount: 120000,
        }),
        buildTipEvent({
          txId: '0xroute-tip-2',
          tipId: 202,
          sender,
          recipient: secondaryRecipient,
          amount: 250000,
          fee: 7500,
          netAmount: 242500,
        }),
        buildAdminEvent({
          txId: '0xroute-admin-1',
          eventType: 'contract-paused',
          data: { paused: true },
        }),
        buildAdminEvent({
          txId: '0xroute-admin-2',
          eventType: 'pause-change-executed',
          data: { paused: true },
        }),
        buildAdminEvent({
          txId: '0xroute-admin-3',
          eventType: 'fee-change-proposed',
          data: { 'new-fee': 250 },
        }),
      ], 202, 1700000001000),
    });

    assert.strictEqual(ingest.status, 200);
    assert.strictEqual(ingest.body.indexed, 5);

    const tipById = await request({
      method: 'GET',
      path: '/api/tips/201',
    });

    assert.strictEqual(tipById.status, 200);
    assert.strictEqual(tipById.body.tipId, '201');
    assert.strictEqual(tipById.body.sender, sender);

    const tipsByUser = await request({
      method: 'GET',
      path: `/api/tips/user/${sender}`,
    });

    assert.strictEqual(tipsByUser.status, 200);
    assert.ok(tipsByUser.body.tips.some((tip) => tip.tipId === '201'));
    assert.ok(tipsByUser.body.tips.some((tip) => tip.tipId === '202'));

    const stats = await request({
      method: 'GET',
      path: '/api/stats',
    });

    assert.strictEqual(stats.status, 200);
    assert.ok(stats.body.totalTips >= 2);
    assert.ok(stats.body.totalVolume >= 375000);
    assert.ok(stats.body.totalFees >= 12500);
    assert.ok(stats.body.uniqueSenders >= 1);
    assert.ok(stats.body.uniqueRecipients >= 2);

    const adminEvents = await request({
      method: 'GET',
      path: '/api/admin/events',
    });

    assert.strictEqual(adminEvents.status, 200);
    assert.ok(adminEvents.body.events.some((event) => event.eventType === 'contract-paused'));
    assert.ok(adminEvents.body.events.some((event) => event.eventType === 'pause-change-executed'));
    assert.ok(adminEvents.body.events.some((event) => event.eventType === 'fee-change-proposed'));

    const bypasses = await request({
      method: 'GET',
      path: '/api/admin/bypasses',
    });

    assert.strictEqual(bypasses.status, 200);
    assert.ok(bypasses.body.bypasses.some((event) => event.eventType === 'contract-paused'));
  });

  it('returns lookup failures for invalid tip and address routes', async () => {
    const missingTip = await request({
      method: 'GET',
      path: '/api/tips/999999',
    });

    assert.strictEqual(missingTip.status, 404);
    assert.strictEqual(missingTip.body.error, 'tip not found');

    const invalidAddress = await request({
      method: 'GET',
      path: '/api/tips/user/not-an-address',
    });

    assert.strictEqual(invalidAddress.status, 400);
    assert.strictEqual(invalidAddress.body.error, 'bad_request');
    assert.strictEqual(invalidAddress.body.message, 'invalid address format');
  });

  it('returns structured errors for malformed payloads', async () => {
    const invalid = await request({
      method: 'POST',
      path: '/api/chainhook/events',
      body: '{not-json',
    });

    assert.strictEqual(invalid.status, 400);
    assert.strictEqual(invalid.body.error, 'bad_request');
    assert.strictEqual(invalid.body.message, 'invalid payload');
    assert.ok(invalid.body.request_id);
    assert.ok(invalid.headers['x-request-id']);
  });

  it('returns health with storage details', async () => {
    const health = await request({
      method: 'GET',
      path: '/health',
    });

    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.body.status, 'healthy');
    assert.strictEqual(health.body.storage.storage_mode, 'memory');
  });
});
