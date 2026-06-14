import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

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

const SENDER = 'SP1SEND1111111111111111111111111111111111';
const RECIPIENT = 'SP1REC1111111111111111111111111111111111';
const SENDER2 = 'SP1SEND2222222222222222222222222222222222';

function buildTipEvent({ txId, tipId, sender, recipient, amount, fee, netAmount, message, category }) {
  const value = {
    event: 'tip-sent',
    'tip-id': tipId,
    sender,
    recipient,
    amount,
    fee,
    'net-amount': netAmount,
  };
  if (message) value.message = message;
  if (category !== undefined) value.category = category;
  return {
    txId,
    payload: {
      type: 'SmartContractEvent',
      data: {
        contract_identifier: 'SP123.tipstream',
        value,
      },
    },
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

describe('Tip Search API', () => {
  before(async () => {
    await new Promise((resolve) => server.listen(0, resolve));

    const ts = Date.now();
    await request({ method: 'POST', path: '/api/chainhook/events', body: buildEventPayload([
      buildTipEvent({ txId: '0xtip1', tipId: 1, sender: SENDER, recipient: RECIPIENT, amount: 1000000, fee: 5000, netAmount: 995000, message: 'hello world', category: 0 }),
    ], 100, ts) });
    await request({ method: 'POST', path: '/api/chainhook/events', body: buildEventPayload([
      buildTipEvent({ txId: '0xtip2', tipId: 2, sender: SENDER2, recipient: RECIPIENT, amount: 5000000, fee: 5000, netAmount: 4995000, message: 'great work', category: 2 }),
    ], 101, ts + 1000) });
    await request({ method: 'POST', path: '/api/chainhook/events', body: buildEventPayload([
      buildTipEvent({ txId: '0xtip3', tipId: 3, sender: SENDER, recipient: SENDER2, amount: 2000000, fee: 5000, netAmount: 1995000, message: 'open source tip', category: 5 }),
    ], 102, ts + 2000) });
    await request({ method: 'POST', path: '/api/chainhook/events', body: buildEventPayload([
      buildTipEvent({ txId: '0xtip4', tipId: 4, sender: SENDER, recipient: RECIPIENT, amount: 3000000, fee: 5000, netAmount: 2995000, message: 'education tip', category: 5 }),
    ], 103, ts + 3000) });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('returns all tips when no filters applied', async () => {
    const res = await request({ method: 'GET', path: '/api/tips/search' });
    assert.equal(res.status, 200);
    assert.equal(res.body.tips.length, 4);
    assert.equal(res.body.total, 4);
  });

  it('filters tips by query string matching message', async () => {
    const res = await request({ method: 'GET', path: '/api/tips/search?q=open' });
    assert.equal(res.status, 200);
    assert.equal(res.body.tips.length, 1);
    assert.equal(res.body.total, 1);
  });

  it('filters tips by sender address', async () => {
    const res = await request({ method: 'GET', path: `/api/tips/search?sender=${SENDER}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.tips.length, 3);
    assert.equal(res.body.total, 3);
  });

  it('filters tips by recipient address', async () => {
    const res = await request({ method: 'GET', path: `/api/tips/search?recipient=${RECIPIENT}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.tips.length, 3);
    assert.equal(res.body.total, 3);
  });

  it('filters tips by minimum amount', async () => {
    const res = await request({ method: 'GET', path: '/api/tips/search?minAmount=2000000' });
    assert.equal(res.status, 200);
    assert.equal(res.body.tips.length, 3);
    assert.equal(res.body.total, 3);
  });

  it('filters tips by maximum amount', async () => {
    const res = await request({ method: 'GET', path: '/api/tips/search?maxAmount=2000000' });
    assert.equal(res.status, 200);
    assert.equal(res.body.tips.length, 2);
    assert.equal(res.body.total, 2);
  });

  it('filters tips by amount range', async () => {
    const res = await request({ method: 'GET', path: '/api/tips/search?minAmount=1000000&maxAmount=3000000' });
    assert.equal(res.status, 200);
    assert.equal(res.body.tips.length, 3);
    assert.equal(res.body.total, 3);
  });

  it('filters tips by category', async () => {
    const res = await request({ method: 'GET', path: '/api/tips/search?category=5' });
    assert.equal(res.status, 200);
    assert.equal(res.body.tips.length, 2);
    assert.equal(res.body.total, 2);
  });

  it('sorts tips by oldest first', async () => {
    const res = await request({ method: 'GET', path: '/api/tips/search?sort=oldest' });
    assert.equal(res.status, 200);
    assert.equal(res.body.tips.length, 4);
  });

  it('sorts tips by highest amount', async () => {
    const res = await request({ method: 'GET', path: '/api/tips/search?sort=amount-high' });
    assert.equal(res.status, 200);
    assert.equal(res.body.tips.length, 4);
    assert.equal(Number(res.body.tips[0].amount), 5000000);
  });

  it('sorts tips by lowest amount', async () => {
    const res = await request({ method: 'GET', path: '/api/tips/search?sort=amount-low' });
    assert.equal(res.status, 200);
    assert.equal(res.body.tips.length, 4);
    assert.equal(Number(res.body.tips[0].amount), 1000000);
  });

  it('returns 400 for invalid sort option', async () => {
    const res = await request({ method: 'GET', path: '/api/tips/search?sort=invalid' });
    assert.equal(res.status, 400);
  });

  it('returns 400 for invalid limit', async () => {
    const res = await request({ method: 'GET', path: '/api/tips/search?limit=abc' });
    assert.equal(res.status, 400);
  });

  it('supports limit parameter', async () => {
    const res = await request({ method: 'GET', path: '/api/tips/search?limit=2' });
    assert.equal(res.status, 200);
    assert.equal(res.body.tips.length, 2);
    assert.equal(res.body.total, 4);
  });

  it('combines sender and category filters', async () => {
    const res = await request({ method: 'GET', path: `/api/tips/search?sender=${SENDER}&category=5` });
    assert.equal(res.status, 200);
    assert.equal(res.body.tips.length, 2);
    assert.equal(res.body.total, 2);
  });
});
