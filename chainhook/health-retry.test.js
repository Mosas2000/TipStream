import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NODE_ENV = 'test';
process.env.CHAINHOOK_AUTH_TOKEN = '';
process.env.CHAINHOOK_STORAGE = 'memory';

const { server } = await import('./server.js');

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: server.address().port,
        path,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

describe('health endpoint with storage state', () => {
  before(async () => {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('returns 200 and status healthy when storage is reachable', async () => {
    const { status, body } = await get('/health');
    assert.strictEqual(status, 200);
    assert.strictEqual(body.status, 'healthy');
    assert.ok(body.storage);
    assert.strictEqual(body.storage.healthy, true);
    assert.ok(typeof body.uptime_seconds === 'number');
    assert.ok(typeof body.timestamp === 'string');
  });

  it('includes storage_mode in health response', async () => {
    const { body } = await get('/health');
    assert.ok(body.storage.storage_mode);
  });

  it('includes retention_days in health response', async () => {
    const { body } = await get('/health');
    assert.ok(typeof body.retention_days === 'number');
  });

  it('includes total_events in storage health', async () => {
    const { body } = await get('/health');
    assert.ok(typeof body.storage.total_events === 'number');
  });

  it('uptime_seconds increases over time', async () => {
    const { body: first } = await get('/health');
    await new Promise((r) => setTimeout(r, 10));
    const { body: second } = await get('/health');
    assert.ok(second.uptime_seconds >= first.uptime_seconds);
  });
});

describe('metrics endpoint includes retry counters', () => {
  before(async () => {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('GET /metrics includes db_retry_attempts counter', async () => {
    const { status, body } = await get('/metrics');
    assert.strictEqual(status, 200);
    assert.ok(typeof body.db_retry_attempts === 'number');
  });

  it('GET /metrics includes db_retry_successes counter', async () => {
    const { body } = await get('/metrics');
    assert.ok(typeof body.db_retry_successes === 'number');
  });

  it('GET /metrics includes db_retry_exhausted counter', async () => {
    const { body } = await get('/metrics');
    assert.ok(typeof body.db_retry_exhausted === 'number');
  });
});
