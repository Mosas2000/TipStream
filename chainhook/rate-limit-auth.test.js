import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NODE_ENV = 'test';
process.env.CHAINHOOK_AUTH_TOKEN = 'test-secret-token';

const { server } = await import('./server.js');

before(async () => {
  await new Promise((resolve) => {
    server.listen(0, () => resolve());
  });
});

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

describe('Rate Limit Configuration Authentication', () => {
  it('GET /api/admin/rate-limit requires authentication', async () => {
    const response = await request({
      method: 'GET',
      path: '/api/admin/rate-limit',
    });

    assert.strictEqual(response.status, 401);
    assert.strictEqual(response.body.error, 'unauthorized');
  });

  it('GET /api/admin/rate-limit accepts valid token', async () => {
    const response = await request({
      method: 'GET',
      path: '/api/admin/rate-limit',
      headers: {
        'Authorization': 'Bearer test-secret-token',
      },
    });

    assert.strictEqual(response.status, 200);
    assert.ok(response.body.maxRequests);
    assert.ok(response.body.windowMs);
  });

  it('GET /api/admin/rate-limit rejects invalid token', async () => {
    const response = await request({
      method: 'GET',
      path: '/api/admin/rate-limit',
      headers: {
        'Authorization': 'Bearer wrong-token',
      },
    });

    assert.strictEqual(response.status, 401);
    assert.strictEqual(response.body.error, 'unauthorized');
  });

  it('POST /api/admin/rate-limit requires authentication', async () => {
    const response = await request({
      method: 'POST',
      path: '/api/admin/rate-limit',
      body: {
        maxRequests: 50,
        windowMs: 30000,
      },
    });

    assert.strictEqual(response.status, 401);
    assert.strictEqual(response.body.error, 'unauthorized');
  });

  it('POST /api/admin/rate-limit accepts valid token', async () => {
    const response = await request({
      method: 'POST',
      path: '/api/admin/rate-limit',
      headers: {
        'Authorization': 'Bearer test-secret-token',
      },
      body: {
        maxRequests: 75,
        windowMs: 45000,
      },
    });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.ok, true);
    assert.strictEqual(response.body.current.maxRequests, 75);
    assert.strictEqual(response.body.current.windowMs, 45000);
  });

  it('POST /api/admin/rate-limit rejects invalid token', async () => {
    const response = await request({
      method: 'POST',
      path: '/api/admin/rate-limit',
      headers: {
        'Authorization': 'Bearer wrong-token',
      },
      body: {
        maxRequests: 50,
        windowMs: 30000,
      },
    });

    assert.strictEqual(response.status, 401);
    assert.strictEqual(response.body.error, 'unauthorized');
  });

  it('GET /api/admin/rate-limit rejects malformed authorization header', async () => {
    const response = await request({
      method: 'GET',
      path: '/api/admin/rate-limit',
      headers: {
        'Authorization': 'InvalidFormat',
      },
    });

    assert.strictEqual(response.status, 401);
  });

  it('POST /api/admin/rate-limit rejects empty authorization header', async () => {
    const response = await request({
      method: 'POST',
      path: '/api/admin/rate-limit',
      headers: {
        'Authorization': '',
      },
      body: {
        maxRequests: 50,
        windowMs: 30000,
      },
    });

    assert.strictEqual(response.status, 401);
  });
});

after(() => {
  server.close();
});
