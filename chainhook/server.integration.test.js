import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NODE_ENV = 'test';

const { server } = await import('./server.js');

function request({ method, path, body, headers = {} }) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
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

    const tips = await request({
      method: 'GET',
      path: '/api/tips?limit=10',
    });

    assert.strictEqual(tips.status, 200);
    assert.strictEqual(tips.body.total, 1);
    assert.strictEqual(tips.body.tips[0].tipId, 1);
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
