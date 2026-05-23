import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { MAX_BODY_SIZE } from './validation.js';

process.env.NODE_ENV = 'test';
process.env.CHAINHOOK_AUTH_TOKEN = '';
process.env.METRICS_AUTH_TOKEN = '';

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

function requestChunked({ method, path, chunks, headers = {} }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: server.address().port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Transfer-Encoding': 'chunked',
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
    for (const chunk of chunks) {
      req.write(chunk);
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

  it('rejects oversized chunked ingest bodies during streaming', async () => {
    const body = JSON.stringify({
      apply: [
        {
          block_identifier: { index: 777 },
          timestamp: 1700000000000,
          transactions: [],
        },
      ],
      padding: 'x'.repeat(MAX_BODY_SIZE),
    });

    const response = await requestChunked({
      method: 'POST',
      path: '/api/chainhook/events',
      chunks: [body.slice(0, Math.ceil(body.length / 2)), body.slice(Math.ceil(body.length / 2))],
    });

    assert.strictEqual(response.status, 413);
    assert.strictEqual(response.body.error, 'payload_too_large');
    assert.strictEqual(response.body.message, 'payload too large');
    assert.ok(response.headers['x-request-id']);
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

  it('retrieves tip by ID', async () => {
    const sender = 'SP1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const recipient = 'SP2BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

    await request({
      method: 'POST',
      path: '/api/chainhook/events',
      body: buildEventPayload([
        buildTipEvent({
          txId: '0xtip-by-id-1',
          tipId: 301,
          sender,
          recipient,
          amount: 50000,
          fee: 2500,
          netAmount: 47500,
        }),
      ], 301, 1700000002000),
    });

    const response = await request({
      method: 'GET',
      path: '/api/tips/301',
    });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.tipId, '301');
    assert.strictEqual(response.body.sender, sender);
    assert.strictEqual(response.body.recipient, recipient);
    assert.strictEqual(response.body.amount, '50000');
    assert.strictEqual(response.body.fee, '2500');
    assert.strictEqual(response.body.netAmount, '47500');
    assert.strictEqual(response.body.txId, '0xtip-by-id-1');
  });

  it('returns 404 for non-existent tip ID', async () => {
    const response = await request({
      method: 'GET',
      path: '/api/tips/888888',
    });

    assert.strictEqual(response.status, 404);
    assert.strictEqual(response.body.error, 'tip not found');
  });

  it('returns 400 for invalid tip ID format', async () => {
    const response = await request({
      method: 'GET',
      path: '/api/tips/-1',
    });

    assert.strictEqual(response.status, 404);
    assert.strictEqual(response.body.error, 'not found');
  });

  it('retrieves tips by user address', async () => {
    const sender = 'SP3CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';
    const recipient1 = 'SP4DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD';
    const recipient2 = 'SP5EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE';

    await request({
      method: 'POST',
      path: '/api/chainhook/events',
      body: buildEventPayload([
        buildTipEvent({
          txId: '0xuser-tip-1',
          tipId: 401,
          sender,
          recipient: recipient1,
          amount: 30000,
          fee: 1500,
          netAmount: 28500,
        }),
        buildTipEvent({
          txId: '0xuser-tip-2',
          tipId: 402,
          sender,
          recipient: recipient2,
          amount: 40000,
          fee: 2000,
          netAmount: 38000,
        }),
      ], 401, 1700000003000),
    });

    const response = await request({
      method: 'GET',
      path: `/api/tips/user/${sender}`,
    });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.tips.length, 2);
    assert.ok(response.body.tips.some((tip) => tip.tipId === '401'));
    assert.ok(response.body.tips.some((tip) => tip.tipId === '402'));
    assert.ok(response.body.tips.every((tip) => tip.sender === sender));
    assert.strictEqual(response.body.total, 2);
  });

  it('retrieves tips received by user address', async () => {
    const sender1 = 'SP6FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';
    const sender2 = 'SP7GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG';
    const recipient = 'SP8HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH';

    await request({
      method: 'POST',
      path: '/api/chainhook/events',
      body: buildEventPayload([
        buildTipEvent({
          txId: '0xreceived-tip-1',
          tipId: 501,
          sender: sender1,
          recipient,
          amount: 15000,
          fee: 750,
          netAmount: 14250,
        }),
        buildTipEvent({
          txId: '0xreceived-tip-2',
          tipId: 502,
          sender: sender2,
          recipient,
          amount: 25000,
          fee: 1250,
          netAmount: 23750,
        }),
      ], 501, 1700000004000),
    });

    const response = await request({
      method: 'GET',
      path: `/api/tips/user/${recipient}`,
    });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.tips.length, 2);
    assert.ok(response.body.tips.every((tip) => tip.recipient === recipient));
    assert.strictEqual(response.body.total, 2);
  });

  it('returns 400 for invalid user address format', async () => {
    const response = await request({
      method: 'GET',
      path: '/api/tips/user/invalid-address',
    });

    assert.strictEqual(response.status, 400);
    assert.strictEqual(response.body.error, 'bad_request');
    assert.strictEqual(response.body.message, 'invalid address format');
  });

  it('returns empty array for user with no tips', async () => {
    const response = await request({
      method: 'GET',
      path: '/api/tips/user/SP9IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII',
    });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.tips.length, 0);
    assert.strictEqual(response.body.total, 0);
  });

  it('returns aggregate statistics', async () => {
    const sender1 = 'SPAJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ';
    const sender2 = 'SPBKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK';
    const recipient1 = 'SPCLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL';
    const recipient2 = 'SPDMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM';

    await request({
      method: 'POST',
      path: '/api/chainhook/events',
      body: buildEventPayload([
        buildTipEvent({
          txId: '0xstats-tip-1',
          tipId: 601,
          sender: sender1,
          recipient: recipient1,
          amount: 100000,
          fee: 5000,
          netAmount: 95000,
        }),
        buildTipEvent({
          txId: '0xstats-tip-2',
          tipId: 602,
          sender: sender2,
          recipient: recipient2,
          amount: 200000,
          fee: 10000,
          netAmount: 190000,
        }),
        buildTipEvent({
          txId: '0xstats-tip-3',
          tipId: 603,
          sender: sender1,
          recipient: recipient2,
          amount: 150000,
          fee: 7500,
          netAmount: 142500,
        }),
      ], 601, 1700000005000),
    });

    const response = await request({
      method: 'GET',
      path: '/api/stats',
    });

    assert.strictEqual(response.status, 200);
    assert.ok(response.body.totalTips >= 3);
    assert.ok(response.body.totalVolume >= 450000);
    assert.ok(response.body.totalFees >= 22500);
    assert.ok(response.body.uniqueSenders >= 2);
    assert.ok(response.body.uniqueRecipients >= 2);
  });

  it('returns zero statistics when no tips exist', async () => {
    const response = await request({
      method: 'GET',
      path: '/api/stats',
    });

    assert.strictEqual(response.status, 200);
    assert.ok(typeof response.body.totalTips === 'number');
    assert.ok(typeof response.body.totalVolume === 'number');
    assert.ok(typeof response.body.totalFees === 'number');
    assert.ok(typeof response.body.uniqueSenders === 'number');
    assert.ok(typeof response.body.uniqueRecipients === 'number');
  });

  it('retrieves admin events', async () => {
    await request({
      method: 'POST',
      path: '/api/chainhook/events',
      body: buildEventPayload([
        buildAdminEvent({
          txId: '0xadmin-event-1',
          eventType: 'fee-change-proposed',
          data: { 'new-fee': 300 },
        }),
        buildAdminEvent({
          txId: '0xadmin-event-2',
          eventType: 'fee-change-executed',
          data: { 'new-fee': 300 },
        }),
        buildAdminEvent({
          txId: '0xadmin-event-3',
          eventType: 'contract-paused',
          data: { paused: true },
        }),
      ], 701, 1700000006000),
    });

    const response = await request({
      method: 'GET',
      path: '/api/admin/events',
    });

    assert.strictEqual(response.status, 200);
    assert.ok(Array.isArray(response.body.events));
    assert.ok(response.body.events.some((e) => e.eventType === 'fee-change-proposed'));
    assert.ok(response.body.events.some((e) => e.eventType === 'fee-change-executed'));
    assert.ok(response.body.events.some((e) => e.eventType === 'contract-paused'));
    assert.ok(typeof response.body.total === 'number');
  });

  it('returns empty array when no admin events exist', async () => {
    const response = await request({
      method: 'GET',
      path: '/api/admin/events',
    });

    assert.strictEqual(response.status, 200);
    assert.ok(Array.isArray(response.body.events));
    assert.ok(typeof response.body.total === 'number');
  });

  it('retrieves detected bypasses', async () => {
    await request({
      method: 'POST',
      path: '/api/chainhook/events',
      body: buildEventPayload([
        buildAdminEvent({
          txId: '0xbypass-1',
          eventType: 'contract-paused',
          data: { paused: true },
        }),
        buildAdminEvent({
          txId: '0xbypass-2',
          eventType: 'pause-change-executed',
          data: { paused: false },
        }),
      ], 801, 1700000007000),
    });

    const response = await request({
      method: 'GET',
      path: '/api/admin/bypasses',
    });

    assert.strictEqual(response.status, 200);
    assert.ok(Array.isArray(response.body.bypasses));
    assert.ok(typeof response.body.total === 'number');
  });

  it('returns empty array when no bypasses detected', async () => {
    const response = await request({
      method: 'GET',
      path: '/api/admin/bypasses',
    });

    assert.strictEqual(response.status, 200);
    assert.ok(Array.isArray(response.body.bypasses));
    assert.strictEqual(response.body.total, response.body.bypasses.length);
  });

  it('paginates tips list correctly', async () => {
    const sender = 'SPENNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN';
    const recipient = 'SPFOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO';

    await request({
      method: 'POST',
      path: '/api/chainhook/events',
      body: buildEventPayload([
        buildTipEvent({
          txId: '0xpage-tip-1',
          tipId: 901,
          sender,
          recipient,
          amount: 10000,
          fee: 500,
          netAmount: 9500,
        }),
        buildTipEvent({
          txId: '0xpage-tip-2',
          tipId: 902,
          sender,
          recipient,
          amount: 20000,
          fee: 1000,
          netAmount: 19000,
        }),
        buildTipEvent({
          txId: '0xpage-tip-3',
          tipId: 903,
          sender,
          recipient,
          amount: 30000,
          fee: 1500,
          netAmount: 28500,
        }),
      ], 901, 1700000008000),
    });

    const page1 = await request({
      method: 'GET',
      path: '/api/tips?limit=2',
    });

    assert.strictEqual(page1.status, 200);
    assert.strictEqual(page1.body.tips.length, 2);
    assert.ok(typeof page1.body.total === 'number');
    assert.ok(page1.body.nextCursor !== undefined);

    const page2 = await request({
      method: 'GET',
      path: `/api/tips?limit=2&cursor=${page1.body.nextCursor}`,
    });

    assert.strictEqual(page2.status, 200);
    assert.ok(Array.isArray(page2.body.tips));
    assert.ok(typeof page2.body.total === 'number');
    assert.ok(page2.body.nextCursor !== undefined);
  });

  it('rejects invalid pagination limit', async () => {
    const response = await request({
      method: 'GET',
      path: '/api/tips?limit=200',
    });

    assert.strictEqual(response.status, 400);
    assert.strictEqual(response.body.error, 'bad_request');
  });

  it('rejects payload without apply field', async () => {
    const response = await request({
      method: 'POST',
      path: '/api/chainhook/events',
      body: { invalid: 'payload' },
    });

    assert.strictEqual(response.status, 400);
    assert.strictEqual(response.body.error, 'bad_request');
    assert.ok(response.body.message.includes('payload.apply must be an array'));
  });

  it('rejects payload with missing block_identifier', async () => {
    const response = await request({
      method: 'POST',
      path: '/api/chainhook/events',
      body: {
        apply: [
          {
            transactions: [],
          },
        ],
      },
    });

    assert.strictEqual(response.status, 400);
    assert.strictEqual(response.body.error, 'bad_request');
    assert.ok(response.body.message.includes('missing block_identifier'));
  });

  it('rejects payload with missing transaction_identifier', async () => {
    const response = await request({
      method: 'POST',
      path: '/api/chainhook/events',
      body: {
        apply: [
          {
            block_identifier: { index: 100 },
            transactions: [
              {
                metadata: {},
              },
            ],
          },
        ],
      },
    });

    assert.strictEqual(response.status, 400);
    assert.strictEqual(response.body.error, 'bad_request');
    assert.ok(response.body.message.includes('missing transaction_identifier'));
  });

  it('accepts payload with empty apply array', async () => {
    const response = await request({
      method: 'POST',
      path: '/api/chainhook/events',
      body: { apply: [] },
    });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.ok, true);
    assert.strictEqual(response.body.indexed, 0);
  });
});

  it('rejects requests during shutdown', async () => {
    const response = await request({
      method: 'POST',
      path: '/api/chainhook/events',
      body: samplePayload(),
    });
    
    assert.strictEqual(response.status, 200);
  });

describe('Rate Limit Configuration', () => {
  it('GET /api/admin/rate-limit returns current configuration', async () => {
    const response = await request({
      method: 'GET',
      path: '/api/admin/rate-limit',
    });

    assert.strictEqual(response.status, 200);
    assert.ok(response.body.maxRequests);
    assert.ok(response.body.windowMs);
    assert.ok(response.body.windowSeconds);
    assert.strictEqual(typeof response.body.maxRequests, 'number');
    assert.strictEqual(typeof response.body.windowMs, 'number');
  });

  it('POST /api/admin/rate-limit updates configuration', async () => {
    const response = await request({
      method: 'POST',
      path: '/api/admin/rate-limit',
      body: {
        maxRequests: 50,
        windowMs: 30000,
      },
    });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.ok, true);
    assert.strictEqual(response.body.current.maxRequests, 50);
    assert.strictEqual(response.body.current.windowMs, 30000);
    assert.strictEqual(response.body.current.windowSeconds, 30);
  });

  it('POST /api/admin/rate-limit validates maxRequests range', async () => {
    const response = await request({
      method: 'POST',
      path: '/api/admin/rate-limit',
      body: {
        maxRequests: 0,
        windowMs: 60000,
      },
    });

    assert.strictEqual(response.status, 400);
    assert.strictEqual(response.body.error, 'bad_request');
    assert.ok(response.body.message.includes('maxRequests must be between 1 and 10000'));
  });

  it('POST /api/admin/rate-limit validates maxRequests upper bound', async () => {
    const response = await request({
      method: 'POST',
      path: '/api/admin/rate-limit',
      body: {
        maxRequests: 20000,
        windowMs: 60000,
      },
    });

    assert.strictEqual(response.status, 400);
    assert.strictEqual(response.body.error, 'bad_request');
    assert.ok(response.body.message.includes('maxRequests must be between 1 and 10000'));
  });

  it('POST /api/admin/rate-limit validates windowMs range', async () => {
    const response = await request({
      method: 'POST',
      path: '/api/admin/rate-limit',
      body: {
        maxRequests: 100,
        windowMs: 500,
      },
    });

    assert.strictEqual(response.status, 400);
    assert.strictEqual(response.body.error, 'bad_request');
    assert.ok(response.body.message.includes('windowMs must be between 1000 and 3600000'));
  });

  it('POST /api/admin/rate-limit validates windowMs upper bound', async () => {
    const response = await request({
      method: 'POST',
      path: '/api/admin/rate-limit',
      body: {
        maxRequests: 100,
        windowMs: 4000000,
      },
    });

    assert.strictEqual(response.status, 400);
    assert.strictEqual(response.body.error, 'bad_request');
    assert.ok(response.body.message.includes('windowMs must be between 1000 and 3600000'));
  });

  it('POST /api/admin/rate-limit returns previous configuration', async () => {
    const getBefore = await request({
      method: 'GET',
      path: '/api/admin/rate-limit',
    });

    const update = await request({
      method: 'POST',
      path: '/api/admin/rate-limit',
      body: {
        maxRequests: 75,
        windowMs: 45000,
      },
    });

    assert.strictEqual(update.status, 200);
    assert.strictEqual(update.body.previous.maxRequests, getBefore.body.maxRequests);
    assert.strictEqual(update.body.previous.windowMs, getBefore.body.windowMs);
    assert.strictEqual(update.body.current.maxRequests, 75);
    assert.strictEqual(update.body.current.windowMs, 45000);
  });

  it('POST /api/admin/rate-limit applies changes immediately', async () => {
    await request({
      method: 'POST',
      path: '/api/admin/rate-limit',
      body: {
        maxRequests: 200,
        windowMs: 60000,
      },
    });

    const getAfter = await request({
      method: 'GET',
      path: '/api/admin/rate-limit',
    });

    assert.strictEqual(getAfter.status, 200);
    assert.strictEqual(getAfter.body.maxRequests, 200);
    assert.strictEqual(getAfter.body.windowMs, 60000);
  });

  it('POST /api/admin/rate-limit rejects invalid JSON', async () => {
    const response = await request({
      method: 'POST',
      path: '/api/admin/rate-limit',
      body: 'invalid json',
    });

    assert.strictEqual(response.status, 400);
  });

  it('POST /api/admin/rate-limit rejects missing maxRequests', async () => {
    const response = await request({
      method: 'POST',
      path: '/api/admin/rate-limit',
      body: {
        windowMs: 60000,
      },
    });

    assert.strictEqual(response.status, 400);
    assert.ok(response.body.message.includes('maxRequests'));
  });

  it('POST /api/admin/rate-limit rejects missing windowMs', async () => {
    const response = await request({
      method: 'POST',
      path: '/api/admin/rate-limit',
      body: {
        maxRequests: 100,
      },
    });

    assert.strictEqual(response.status, 400);
    assert.ok(response.body.message.includes('windowMs'));
  });
});
