import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { WebSocket } from "ws";
import { WebSocketManager, MSG_TYPE } from "./websocket.js";

function createTestServer() {
  const manager = new WebSocketManager();
  const server = http.createServer();
  manager.attach(server);
  return { manager, server };
}

function waitForMessage(ws) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("message timeout")), 3000);
    ws.once("message", (data) => {
      clearTimeout(timer);
      resolve(JSON.parse(data.toString()));
    });
  });
}

function waitForOpen(ws) {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) return resolve();
    const timer = setTimeout(() => reject(new Error("open timeout")), 3000);
    ws.once("open", () => { clearTimeout(timer); resolve(); });
    ws.once("error", (err) => { clearTimeout(timer); reject(err); });
  });
}

function waitForClose(ws) {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.CLOSED) return resolve();
    ws.once("close", resolve);
  });
}

function listenAsync(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
}

function closeAsync(server) {
  return new Promise((resolve) => server.close(resolve));
}

const SAMPLE_TIP = {
  tipId: "1",
  sender: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
  recipient: "SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE",
  amount: "1000000",
  fee: "5000",
  txId: "0xabc123",
  blockHeight: 100,
  timestamp: 1700000000,
};

describe("WebSocketManager", () => {
  describe("attach and connection", () => {
    let manager, server, port;

    before(async () => {
      ({ manager, server } = createTestServer());
      await listenAsync(server);
      port = server.address().port;
    });

    after(async () => {
      manager.close();
      await closeAsync(server);
    });

    it("accepts a WebSocket connection on /ws", async () => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      await waitForOpen(ws);
      assert.strictEqual(ws.readyState, WebSocket.OPEN);
      ws.close();
      await waitForClose(ws);
    });

    it("sends a connected message on new connection", async () => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      const msg = await waitForMessage(ws);
      assert.strictEqual(msg.type, MSG_TYPE.CONNECTED);
      assert.ok(msg.data.message);
      assert.ok(typeof msg.timestamp === "number");
      ws.close();
      await waitForClose(ws);
    });

    it("rejects connections on paths other than /ws", async () => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/other`);
      await new Promise((resolve) => {
        ws.on("error", () => {});
        ws.on("close", () => resolve());
      });
      assert.ok([WebSocket.CLOSING, WebSocket.CLOSED].includes(ws.readyState));
    });

    it("increments clientCount on connection", async () => {
      const before = manager.clientCount;
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      await waitForOpen(ws);
      assert.strictEqual(manager.clientCount, before + 1);
      ws.close();
      await waitForClose(ws);
    });

    it("decrements clientCount on disconnect", async () => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      await waitForOpen(ws);
      const countWhileOpen = manager.clientCount;
      ws.close();
      await waitForClose(ws);
      await new Promise((r) => setTimeout(r, 50));
      assert.strictEqual(manager.clientCount, countWhileOpen - 1);
    });
  });

  describe("broadcast", () => {
    let manager, server, port;

    before(async () => {
      ({ manager, server } = createTestServer());
      await listenAsync(server);
      port = server.address().port;
    });

    after(async () => {
      manager.close();
      await closeAsync(server);
    });

    it("broadcasts a tip_event to all connected clients", async () => {
      const ws1 = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      const ws2 = new WebSocket(`ws://127.0.0.1:${port}/ws`);

      await Promise.all([waitForOpen(ws1), waitForOpen(ws2)]);

      const p1 = waitForMessage(ws1);
      const p2 = waitForMessage(ws2);

      manager.broadcast(SAMPLE_TIP);

      const [msg1, msg2] = await Promise.all([p1, p2]);

      assert.strictEqual(msg1.type, MSG_TYPE.TIP_EVENT);
      assert.strictEqual(msg2.type, MSG_TYPE.TIP_EVENT);
      assert.deepStrictEqual(msg1.data, SAMPLE_TIP);
      assert.deepStrictEqual(msg2.data, SAMPLE_TIP);

      ws1.close();
      ws2.close();
      await Promise.all([waitForClose(ws1), waitForClose(ws2)]);
    });

    it("broadcast message includes a timestamp", async () => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      await waitForOpen(ws);

      const p = waitForMessage(ws);
      manager.broadcast(SAMPLE_TIP);
      const msg = await p;

      assert.ok(typeof msg.timestamp === "number");
      assert.ok(msg.timestamp > 0);

      ws.close();
      await waitForClose(ws);
    });

    it("does not throw when no clients are connected", () => {
      assert.doesNotThrow(() => manager.broadcast(SAMPLE_TIP));
    });

    it("does not throw when wsManager is not attached", () => {
      const unattached = new WebSocketManager();
      assert.doesNotThrow(() => unattached.broadcast(SAMPLE_TIP));
    });
  });

  describe("address subscription", () => {
    let manager, server, port;

    before(async () => {
      ({ manager, server } = createTestServer());
      await listenAsync(server);
      port = server.address().port;
    });

    after(async () => {
      manager.close();
      await closeAsync(server);
    });

    it("subscribed client receives events matching their address as recipient", async () => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      await waitForOpen(ws);

      ws.send(JSON.stringify({ type: "subscribe", address: SAMPLE_TIP.recipient }));
      await new Promise((r) => setTimeout(r, 50));

      const p = waitForMessage(ws);
      manager.broadcast(SAMPLE_TIP);
      const msg = await p;

      assert.strictEqual(msg.type, MSG_TYPE.TIP_EVENT);
      assert.strictEqual(msg.data.recipient, SAMPLE_TIP.recipient);

      ws.close();
      await waitForClose(ws);
    });

    it("subscribed client receives events matching their address as sender", async () => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      await waitForOpen(ws);

      ws.send(JSON.stringify({ type: "subscribe", address: SAMPLE_TIP.sender }));
      await new Promise((r) => setTimeout(r, 50));

      const p = waitForMessage(ws);
      manager.broadcast(SAMPLE_TIP);
      const msg = await p;

      assert.strictEqual(msg.type, MSG_TYPE.TIP_EVENT);
      assert.strictEqual(msg.data.sender, SAMPLE_TIP.sender);

      ws.close();
      await waitForClose(ws);
    });

    it("subscribed client does not receive events for other addresses", async () => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      await waitForOpen(ws);

      ws.send(JSON.stringify({ type: "subscribe", address: "SPUNRELATED000000000000000000000000000000" }));
      await new Promise((r) => setTimeout(r, 50));

      let received = false;
      ws.on("message", () => { received = true; });

      manager.broadcast(SAMPLE_TIP);
      await new Promise((r) => setTimeout(r, 100));

      assert.strictEqual(received, false);

      ws.close();
      await waitForClose(ws);
    });

    it("unsubscribed client receives all events", async () => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      await waitForOpen(ws);

      const p = waitForMessage(ws);
      manager.broadcast(SAMPLE_TIP);
      const msg = await p;

      assert.strictEqual(msg.type, MSG_TYPE.TIP_EVENT);

      ws.close();
      await waitForClose(ws);
    });

    it("client can unsubscribe after subscribing", async () => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      await waitForOpen(ws);

      ws.send(JSON.stringify({ type: "subscribe", address: "SPUNRELATED000000000000000000000000000000" }));
      await new Promise((r) => setTimeout(r, 50));

      ws.send(JSON.stringify({ type: "unsubscribe" }));
      await new Promise((r) => setTimeout(r, 50));

      const p = waitForMessage(ws);
      manager.broadcast(SAMPLE_TIP);
      const msg = await p;

      assert.strictEqual(msg.type, MSG_TYPE.TIP_EVENT);

      ws.close();
      await waitForClose(ws);
    });

    it("returns error for invalid JSON message", async () => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      await waitForOpen(ws);

      ws.send("not valid json");
      const msg = await waitForMessage(ws);

      assert.strictEqual(msg.type, MSG_TYPE.ERROR);

      ws.close();
      await waitForClose(ws);
    });
  });

  describe("close", () => {
    it("terminates all clients on close", async () => {
      const { manager, server } = createTestServer();
      await listenAsync(server);
      const port = server.address().port;

      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      await waitForOpen(ws);

      manager.close();
      await waitForClose(ws);

      assert.strictEqual(manager.clientCount, 0);
      await closeAsync(server);
    });

    it("clientCount is zero after close", async () => {
      const { manager, server } = createTestServer();
      await listenAsync(server);
      const port = server.address().port;

      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      await waitForOpen(ws);

      manager.close();
      await new Promise((r) => setTimeout(r, 50));

      assert.strictEqual(manager.clientCount, 0);
      await closeAsync(server);
    });
  });
});
