import { test } from "node:test";
import assert from "node:assert";
import { createServer } from "./test-server.js";

test("GET /api/analytics returns analytics data", async () => {
  const { request, close } = await createServer();
  
  const response = await request({
    method: 'GET',
    path: '/api/analytics',
  });
  
  assert.strictEqual(response.status, 200);
  assert.ok(response.body.summary);
  assert.ok(response.body.topSenders);
  assert.ok(response.body.topRecipients);
  assert.ok(response.body.timeSeriesData);
  assert.ok(Array.isArray(response.body.topSenders));
  assert.ok(Array.isArray(response.body.topRecipients));
  assert.ok(Array.isArray(response.body.timeSeriesData));
  
  await close();
});

test("GET /api/analytics filters by start date", async () => {
  const { request, close } = await createServer();
  
  const startDate = new Date('2024-01-01').toISOString();
  const response = await request({
    method: 'GET',
    path: `/api/analytics?startDate=${startDate}`,
  });
  
  assert.strictEqual(response.status, 200);
  assert.ok(response.body.summary);
  
  await close();
});

test("GET /api/analytics filters by end date", async () => {
  const { request, close } = await createServer();
  
  const endDate = new Date().toISOString();
  const response = await request({
    method: 'GET',
    path: `/api/analytics?endDate=${endDate}`,
  });
  
  assert.strictEqual(response.status, 200);
  assert.ok(response.body.summary);
  
  await close();
});

test("GET /api/analytics filters by date range", async () => {
  const { request, close } = await createServer();
  
  const startDate = new Date('2024-01-01').toISOString();
  const endDate = new Date().toISOString();
  const response = await request({
    method: 'GET',
    path: `/api/analytics?startDate=${startDate}&endDate=${endDate}`,
  });
  
  assert.strictEqual(response.status, 200);
  assert.ok(response.body.summary);
  assert.ok(response.body.timeSeriesData);
  
  await close();
});

test("GET /api/analytics returns correct summary structure", async () => {
  const { request, close } = await createServer();
  
  const response = await request({
    method: 'GET',
    path: '/api/analytics',
  });
  
  assert.strictEqual(response.status, 200);
  assert.ok(typeof response.body.summary.totalTips === 'number');
  assert.ok(typeof response.body.summary.totalVolume === 'number');
  assert.ok(typeof response.body.summary.totalFees === 'number');
  assert.ok(typeof response.body.summary.avgTipAmount === 'number');
  assert.ok(typeof response.body.summary.uniqueSenders === 'number');
  assert.ok(typeof response.body.summary.uniqueRecipients === 'number');
  
  await close();
});

test("GET /api/analytics returns top senders with correct structure", async () => {
  const { request, close } = await createServer();
  
  const response = await request({
    method: 'GET',
    path: '/api/analytics',
  });
  
  assert.strictEqual(response.status, 200);
  if (response.body.topSenders.length > 0) {
    const sender = response.body.topSenders[0];
    assert.ok(sender.address);
    assert.ok(typeof sender.count === 'number');
    assert.ok(typeof sender.volume === 'number');
  }
  
  await close();
});

test("GET /api/analytics returns top recipients with correct structure", async () => {
  const { request, close } = await createServer();
  
  const response = await request({
    method: 'GET',
    path: '/api/analytics',
  });
  
  assert.strictEqual(response.status, 200);
  if (response.body.topRecipients.length > 0) {
    const recipient = response.body.topRecipients[0];
    assert.ok(recipient.address);
    assert.ok(typeof recipient.count === 'number');
    assert.ok(typeof recipient.volume === 'number');
  }
  
  await close();
});

test("GET /api/analytics returns time series data with correct structure", async () => {
  const { request, close } = await createServer();
  
  const response = await request({
    method: 'GET',
    path: '/api/analytics',
  });
  
  assert.strictEqual(response.status, 200);
  if (response.body.timeSeriesData.length > 0) {
    const dataPoint = response.body.timeSeriesData[0];
    assert.ok(dataPoint.date);
    assert.ok(typeof dataPoint.count === 'number');
    assert.ok(typeof dataPoint.volume === 'number');
  }
  
  await close();
});

test("GET /api/analytics limits top senders to 10", async () => {
  const { request, close } = await createServer();
  
  const response = await request({
    method: 'GET',
    path: '/api/analytics',
  });
  
  assert.strictEqual(response.status, 200);
  assert.ok(response.body.topSenders.length <= 10);
  
  await close();
});

test("GET /api/analytics limits top recipients to 10", async () => {
  const { request, close } = await createServer();
  
  const response = await request({
    method: 'GET',
    path: '/api/analytics',
  });
  
  assert.strictEqual(response.status, 200);
  assert.ok(response.body.topRecipients.length <= 10);
  
  await close();
});
