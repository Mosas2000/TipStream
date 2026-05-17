import { WebSocketServer, WebSocket } from "ws";
import { logger } from "./logging.js";

const HEARTBEAT_INTERVAL_MS = 30_000;
const CLIENT_TIMEOUT_MS = 60_000;

/**
 * Message types sent from server to clients.
 */
export const MSG_TYPE = {
  CONNECTED: "connected",
  TIP_EVENT: "tip_event",
  PING: "ping",
  ERROR: "error",
};

/**
 * WebSocketManager manages all connected clients, heartbeats, and
 * broadcasting of tip events to subscribed connections.
 *
 * Clients may optionally subscribe to a specific address by sending:
 *   { type: "subscribe", address: "SP..." }
 *
 * When subscribed, the client only receives events where the address
 * appears as sender or recipient.  Unsubscribed clients receive all events.
 */
export class WebSocketManager {
  constructor() {
    this._wss = null;
    this._clients = new Map();
    this._heartbeatTimer = null;
  }

  /**
   * Attach the WebSocket server to an existing http.Server instance.
   * Uses the "upgrade" event so the HTTP server and WS server share one port.
   *
   * @param {import("node:http").Server} httpServer
   */
  attach(httpServer) {
    this._wss = new WebSocketServer({ noServer: true });

    httpServer.on("upgrade", (req, socket, head) => {
      const url = new URL(req.url, `http://localhost`);
      if (url.pathname !== "/ws") {
        socket.destroy();
        return;
      }
      this._wss.handleUpgrade(req, socket, head, (ws) => {
        this._wss.emit("connection", ws, req);
      });
    });

    this._wss.on("connection", (ws, req) => this._onConnection(ws, req));

    this._heartbeatTimer = setInterval(
      () => this._heartbeat(),
      HEARTBEAT_INTERVAL_MS
    );

    logger.info("WebSocket server attached", { path: "/ws" });
  }

  /**
   * Broadcast a tip event to all connected clients.
   * Clients subscribed to a specific address only receive events that
   * involve that address as sender or recipient.
   *
   * @param {object} tipEvent - Parsed tip event object.
   */
  broadcast(tipEvent) {
    if (!this._wss) return;

    const message = JSON.stringify({
      type: MSG_TYPE.TIP_EVENT,
      data: tipEvent,
      timestamp: Date.now(),
    });

    let sent = 0;
    for (const [ws, meta] of this._clients) {
      if (ws.readyState !== WebSocket.OPEN) continue;

      if (meta.address) {
        const relevant =
          tipEvent.sender === meta.address ||
          tipEvent.recipient === meta.address;
        if (!relevant) continue;
      }

      try {
        ws.send(message);
        sent++;
      } catch (err) {
        logger.warn("WebSocket send failed", { error: err.message });
      }
    }

    logger.info("WebSocket broadcast", {
      tip_id: tipEvent.tipId,
      clients_total: this._clients.size,
      clients_sent: sent,
    });
  }

  /**
   * Return the number of currently connected clients.
   * @returns {number}
   */
  get clientCount() {
    return this._clients.size;
  }

  /**
   * Close all connections and stop the heartbeat timer.
   * Called during graceful shutdown.
   */
  close() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }

    for (const [ws] of this._clients) {
      try {
        ws.terminate();
      } catch (_) {}
    }
    this._clients.clear();

    if (this._wss) {
      this._wss.close();
      this._wss = null;
    }

    logger.info("WebSocket server closed");
  }

  _onConnection(ws, req) {
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.socket?.remoteAddress ||
      "unknown";

    this._clients.set(ws, {
      ip: clientIp,
      address: null,
      connectedAt: Date.now(),
      lastPong: Date.now(),
    });

    logger.info("WebSocket client connected", {
      ip: clientIp,
      total_clients: this._clients.size,
    });

    ws.send(
      JSON.stringify({
        type: MSG_TYPE.CONNECTED,
        data: { message: "Connected to TipStream real-time feed" },
        timestamp: Date.now(),
      })
    );

    ws.on("message", (raw) => this._onMessage(ws, raw));
    ws.on("pong", () => this._onPong(ws));
    ws.on("close", () => this._onClose(ws, clientIp));
    ws.on("error", (err) => this._onError(ws, err, clientIp));
  }

  _onMessage(ws, raw) {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.send(
        JSON.stringify({
          type: MSG_TYPE.ERROR,
          data: { message: "Invalid JSON" },
          timestamp: Date.now(),
        })
      );
      return;
    }

    if (msg.type === "subscribe" && typeof msg.address === "string") {
      const meta = this._clients.get(ws);
      if (meta) {
        meta.address = msg.address;
        logger.info("WebSocket client subscribed", {
          ip: meta.ip,
          address: msg.address,
        });
      }
    }

    if (msg.type === "unsubscribe") {
      const meta = this._clients.get(ws);
      if (meta) {
        meta.address = null;
        logger.info("WebSocket client unsubscribed", { ip: meta.ip });
      }
    }
  }

  _onPong(ws) {
    const meta = this._clients.get(ws);
    if (meta) meta.lastPong = Date.now();
  }

  _onClose(ws, clientIp) {
    this._clients.delete(ws);
    logger.info("WebSocket client disconnected", {
      ip: clientIp,
      total_clients: this._clients.size,
    });
  }

  _onError(ws, err, clientIp) {
    logger.warn("WebSocket client error", { ip: clientIp, error: err.message });
    this._clients.delete(ws);
  }

  _heartbeat() {
    const now = Date.now();
    for (const [ws, meta] of this._clients) {
      if (ws.readyState !== WebSocket.OPEN) {
        this._clients.delete(ws);
        continue;
      }

      if (now - meta.lastPong > CLIENT_TIMEOUT_MS) {
        logger.info("WebSocket client timed out", { ip: meta.ip });
        ws.terminate();
        this._clients.delete(ws);
        continue;
      }

      try {
        ws.ping();
      } catch (err) {
        logger.warn("WebSocket ping failed", { ip: meta.ip, error: err.message });
        this._clients.delete(ws);
      }
    }
  }
}

export const wsManager = new WebSocketManager();
