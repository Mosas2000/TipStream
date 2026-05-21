import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

process.env.NODE_ENV = "test";
process.env.CHAINHOOK_AUTH_TOKEN = "";
process.env.METRICS_AUTH_TOKEN = "";

const { server } = await import("./server.js");

const VALID_ADDRESS = "SP1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE";
const OTHER_ADDRESS = "SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T";

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : "";
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: server.address().port,
        path,
        method,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

before(() => {
  return new Promise((resolve) => {
    if (server.listening) return resolve();
    server.listen(0, "127.0.0.1", resolve);
  });
});

after(() => {
  return new Promise((resolve) => server.close(resolve));
});

describe("GET /api/notifications/preferences/:address", () => {
  it("returns default preferences for an address with no stored data", async () => {
    const res = await request("GET", `/api/notifications/preferences/${VALID_ADDRESS}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.preferences);
    assert.equal(res.body.preferences.address, VALID_ADDRESS);
    assert.equal(typeof res.body.preferences.channels, "object");
    assert.equal(typeof res.body.preferences.events, "object");
    assert.equal(res.body.preferences.channels.in_app, true);
    assert.equal(res.body.preferences.channels.email, false);
    assert.equal(res.body.preferences.events.tip_received, true);
    assert.equal(res.body.preferences.events.tip_sent, false);
  });

  it("returns 400 for an invalid address format", async () => {
    const res = await request("GET", "/api/notifications/preferences/not-an-address");
    assert.equal(res.status, 400);
    assert.match(res.body.message, /invalid address/i);
  });

  it("returns 404 for an unrelated route", async () => {
    const res = await request("GET", "/api/notifications/unknown");
    assert.equal(res.status, 404);
  });
});

describe("PUT /api/notifications/preferences/:address", () => {
  it("creates preferences and returns 200 with the merged record", async () => {
    const res = await request("PUT", `/api/notifications/preferences/${OTHER_ADDRESS}`, {
      channels: { email: true },
      email: "user@example.com",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.preferences.channels.email, true);
    assert.equal(res.body.preferences.email, "user@example.com");
  });

  it("merges partial updates without overwriting untouched fields", async () => {
    await request("PUT", `/api/notifications/preferences/${OTHER_ADDRESS}`, {
      channels: { in_app: false },
    });
    const res = await request("GET", `/api/notifications/preferences/${OTHER_ADDRESS}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.preferences.channels.in_app, false);
    assert.equal(res.body.preferences.channels.email, true);
  });

  it("returns 400 for an invalid address", async () => {
    const res = await request("PUT", "/api/notifications/preferences/bad-addr", {
      channels: { in_app: false },
    });
    assert.equal(res.status, 400);
  });

  it("returns 400 for an unknown channel key", async () => {
    const res = await request("PUT", `/api/notifications/preferences/${VALID_ADDRESS}`, {
      channels: { sms: true },
    });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /unknown channel/i);
  });

  it("returns 400 for an unknown event type", async () => {
    const res = await request("PUT", `/api/notifications/preferences/${VALID_ADDRESS}`, {
      events: { mystery_event: true },
    });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /unknown event type/i);
  });

  it("returns 400 for a malformed email", async () => {
    const res = await request("PUT", `/api/notifications/preferences/${VALID_ADDRESS}`, {
      email: "not-valid",
    });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /email/i);
  });

  it("accepts null email to clear the stored address", async () => {
    await request("PUT", `/api/notifications/preferences/${VALID_ADDRESS}`, {
      email: "clear@example.com",
    });
    const res = await request("PUT", `/api/notifications/preferences/${VALID_ADDRESS}`, {
      email: null,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.preferences.email, null);
  });

  it("accepts all valid event types toggled", async () => {
    const res = await request("PUT", `/api/notifications/preferences/${VALID_ADDRESS}`, {
      events: {
        tip_received: false,
        tip_sent: true,
        scheduled_tip_executed: false,
        scheduled_tip_failed: false,
        refund_requested: false,
        refund_resolved: false,
      },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.preferences.events.tip_sent, true);
    assert.equal(res.body.preferences.events.tip_received, false);
  });

  it("persists preferences so a subsequent GET reflects the update", async () => {
    await request("PUT", `/api/notifications/preferences/${VALID_ADDRESS}`, {
      channels: { email: true },
    });
    const res = await request("GET", `/api/notifications/preferences/${VALID_ADDRESS}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.preferences.channels.email, true);
  });
});

describe("DELETE /api/notifications/preferences/:address", () => {
  it("deletes stored preferences and returns deleted: true", async () => {
    await request("PUT", `/api/notifications/preferences/${VALID_ADDRESS}`, {
      email: "todelete@example.com",
    });
    const res = await request("DELETE", `/api/notifications/preferences/${VALID_ADDRESS}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.deleted, true);
  });

  it("returns deleted: false when no preferences were stored for the address", async () => {
    const fresh = "SP2DEMOADDRESS0000000000000000000000ABCDEF";
    const res = await request("DELETE", `/api/notifications/preferences/${fresh}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.deleted, false);
  });

  it("returns default preferences after deletion on a subsequent GET", async () => {
    await request("PUT", `/api/notifications/preferences/${VALID_ADDRESS}`, {
      channels: { email: true },
    });
    await request("DELETE", `/api/notifications/preferences/${VALID_ADDRESS}`);
    const res = await request("GET", `/api/notifications/preferences/${VALID_ADDRESS}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.preferences.channels.email, false);
  });

  it("returns 400 for an invalid address", async () => {
    const res = await request("DELETE", "/api/notifications/preferences/bad");
    assert.equal(res.status, 400);
  });
});
