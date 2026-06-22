import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

process.env.NODE_ENV = "test";
process.env.CHAINHOOK_STORAGE = "memory"; // force memory store for tests

const { server } = await import("./server.js");

const CREATOR_ADDRESS = "SP1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE";
const OTHER_CREATOR = "SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T";

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

describe("Creator Goals API", () => {
  it("returns null/empty goal initially", async () => {
    const res = await request("GET", `/api/goals/${CREATOR_ADDRESS}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.goal, null);
  });

  it("can create/update a goal using PUT", async () => {
    const goalData = {
      goalTitle: "Buy a new microphone",
      goalTarget: 100,
      goalSlug: "new-mic",
      goalDescription: "Need a high-quality streaming mic",
      active: true
    };
    
    const res = await request("PUT", `/api/goals/${CREATOR_ADDRESS}`, goalData);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    assert.ok(res.body.goal);
    assert.strictEqual(res.body.goal.creatorAddress, CREATOR_ADDRESS);
    assert.strictEqual(res.body.goal.goalTitle, "Buy a new microphone");
    assert.strictEqual(res.body.goal.goalTarget, 100);
    assert.strictEqual(res.body.goal.goalSlug, "new-mic");
  });

  it("returns 400 for bad PUT parameters", async () => {
    const res = await request("PUT", `/api/goals/${CREATOR_ADDRESS}`, {
      goalTitle: "No Target"
    });
    assert.strictEqual(res.status, 400);
  });

  it("can fetch the created goal using GET", async () => {
    const res = await request("GET", `/api/goals/${CREATOR_ADDRESS}`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.goal);
    assert.strictEqual(res.body.goal.goalTitle, "Buy a new microphone");
  });

  it("can delete the goal using DELETE", async () => {
    const res = await request("DELETE", `/api/goals/${CREATOR_ADDRESS}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.deleted, true);

    const getRes = await request("GET", `/api/goals/${CREATOR_ADDRESS}`);
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.body.goal, null);
  });
});

describe("Tip Message API", () => {
  it("can register a message for a transaction", async () => {
    const res = await request("POST", "/api/tips/message", {
      txId: "0x123abc456",
      message: "Sending some support! #goal-coffee"
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.saved, true);
  });

  it("returns 400 when registering message with missing params", async () => {
    const res = await request("POST", "/api/tips/message", {
      message: "Just message, no txId"
    });
    assert.strictEqual(res.status, 400);
  });
});
