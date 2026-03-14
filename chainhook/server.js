import http from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
// Timelock bypass detection utilities
import { detectBypass, parseAdminEvent, formatBypassAlert } from "./bypass-detection.js";
// Input validation utilities
import { MAX_BODY_SIZE, isValidStacksAddress, sanitizeQueryInt } from "./validation.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3100; // default webhook listener port
const AUTH_TOKEN = process.env.CHAINHOOK_AUTH_TOKEN || ""; // optional bearer token
const DATA_DIR = join(__dirname, "data"); // persistent storage directory
const DB_FILE = join(DATA_DIR, "events.json"); // JSON event store

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Serialized write queue. Node.js is single-threaded but async handlers
// can interleave between await points. This queue ensures file operations
// are atomic by chaining them sequentially.
let writeQueue = Promise.resolve();

/**
 * Serialize access to the events file.
 * Chains the provided function onto a promise queue so that only one
 * read-modify-write cycle runs at a time.
 * @param {() => void} fn - Synchronous function that reads and writes events.
 * @returns {Promise<void>}
 */
function withEventLock(fn) {
  writeQueue = writeQueue.then(fn).catch((err) => {
    console.error('Event lock operation failed:', err.message);
  });
  return writeQueue;
}

/**
 * Load all stored events from the JSON file.
 * Returns an empty array if the file does not exist or is corrupted.
 * @returns {Array<object>}
 */
function loadEvents() {
  if (!existsSync(DB_FILE)) return [];
  try {
    return JSON.parse(readFileSync(DB_FILE, "utf-8"));
  } catch {
    return [];
  }
}

/**
 * Persist events to the JSON file.
 * Must only be called within withEventLock to avoid race conditions.
 * @param {Array<object>} events
 */
function saveEvents(events) {
  writeFileSync(DB_FILE, JSON.stringify(events, null, 2));
}

/**
 * Read and parse a JSON request body from a readable stream.
 * Rejects if the body exceeds MAX_BODY_SIZE or contains invalid JSON.
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<object>}
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error("Request body too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

/**
 * Extract on-chain events from a Chainhook webhook payload.
 * Filters for SmartContractEvent and print_event types only.
 * @param {object} payload - The parsed Chainhook webhook body.
 * @returns {Array<object>} Extracted event objects.
 */
function extractEvents(payload) {
  const events = [];
  const apply = payload.apply || [];
  for (const block of apply) {
    const transactions = block.transactions || [];
    for (const tx of transactions) {
      const metadata = tx.metadata || {};
      const receipt = metadata.receipt || {};
      const printEvents = receipt.events || [];

      for (const evt of printEvents) {
        if (evt.type !== "SmartContractEvent" && evt.type !== "print_event") continue;
        const data = evt.data || evt.contract_event || {};
        const value = data.value || data.raw_value;
        if (!value) continue;

        events.push({
          txId: tx.transaction_identifier?.hash || "",
          blockHeight: block.block_identifier?.index || 0,
          timestamp: block.timestamp || Date.now(),
          contract: data.contract_identifier || "",
          event: value,
        });
      }
    }
  }
  return events;
}

/**
 * Send a JSON response with the given status code.
 * @param {import('node:http').ServerResponse} res
 * @param {number} statusCode
 * @param {object} data
 */
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

/**
 * Parse a raw on-chain event into a structured tip object.
 * Returns null if the event is not a tip-sent event.
 * @param {object} event - A raw event from extractEvents.
 * @returns {object|null}
 */
function parseTipEvent(event) {
  const val = event.event;
  if (!val || typeof val !== "object") return null;
  if (val.event !== "tip-sent") return null;
  return {
    tipId: val["tip-id"],
    sender: val.sender,
    recipient: val.recipient,
    amount: val.amount,
    fee: val.fee,
    netAmount: val["net-amount"],
    txId: event.txId,
    blockHeight: event.blockHeight,
    timestamp: event.timestamp,
  };
}

function __test_resetQueue() {
  writeQueue = Promise.resolve();
}

export { parseBody, extractEvents, parseTipEvent, sendJson, withEventLock, loadEvents, __test_resetQueue };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // POST /api/chainhook/events -- ingest webhook payloads
  if (req.method === "POST" && path === "/api/chainhook/events") {
    // Early rejection based on Content-Length header
    const contentLength = parseInt(req.headers["content-length"], 10);
    if (contentLength > MAX_BODY_SIZE) {
      return sendJson(res, 413, { error: "payload too large" });
    }

    // Verify bearer token when AUTH_TOKEN is configured
    if (AUTH_TOKEN) {
      const auth = req.headers.authorization || "";
      if (auth !== `Bearer ${AUTH_TOKEN}`) {
        return sendJson(res, 401, { error: "unauthorized" });
      }
    }

    try {
      const payload = await parseBody(req);
      const newEvents = extractEvents(payload);
      if (newEvents.length > 0) {
        await withEventLock(() => {
          const stored = loadEvents();

          for (const evt of newEvents) {
            const detection = detectBypass(evt, stored.slice(-50));
            if (detection.isBypass) {
              console.warn(formatBypassAlert(detection, evt));
            }
            const adminEvt = parseAdminEvent(evt);
            if (adminEvt) {
              console.log(`Admin event: ${adminEvt.eventType} at block ${adminEvt.blockHeight}`);
            }
          }

          stored.push(...newEvents);
          saveEvents(stored);
          console.log(`Indexed ${newEvents.length} events (total: ${stored.length})`);
        });
      }
      return sendJson(res, 200, { ok: true, indexed: newEvents.length });
    } catch (err) {
      console.error("Failed to process chainhook payload:", err.message);
      if (err.message === "Request body too large") {
        return sendJson(res, 413, { error: "payload too large" });
      }
      return sendJson(res, 400, { error: "invalid payload" });
    }
  }

  // GET /api/tips -- paginated list of parsed tips
  if (req.method === "GET" && path === "/api/tips") {
    const limit = sanitizeQueryInt(url.searchParams.get("limit") || "20", 1, 100);
    const offset = sanitizeQueryInt(url.searchParams.get("offset") || "0", 0, Number.MAX_SAFE_INTEGER);

    if (isNaN(limit)) {
      return sendJson(res, 400, { error: "limit must be between 1 and 100" });
    }
    if (isNaN(offset)) {
      return sendJson(res, 400, { error: "offset must be a non-negative integer" });
    }

    const allEvents = loadEvents();
    const tips = allEvents
      .map(parseTipEvent)
      .filter(Boolean)
      .reverse();
    const paged = tips.slice(offset, offset + limit);
    return sendJson(res, 200, { tips: paged, total: tips.length });
  }

  // GET /api/tips/user/:address -- tips sent or received by address
  if (req.method === "GET" && path.startsWith("/api/tips/user/")) {
    const address = path.split("/api/tips/user/")[1];
    if (!isValidStacksAddress(address)) {
      return sendJson(res, 400, { error: "invalid address format" });
    }
    const allEvents = loadEvents();
    const tips = allEvents
      .map(parseTipEvent)
      .filter((t) => t && (t.sender === address || t.recipient === address))
      .reverse();
    return sendJson(res, 200, { tips, total: tips.length });
  }

  // GET /api/tips/:id -- single tip by numeric ID
  if (req.method === "GET" && path.match(/^\/api\/tips\/\d+$/)) {
    const tipId = parseInt(path.split("/api/tips/")[1], 10);
    if (isNaN(tipId) || tipId < 0) {
      return sendJson(res, 400, { error: "invalid tip ID" });
    }
    const allEvents = loadEvents();
    const tip = allEvents.map(parseTipEvent).find((t) => t && t.tipId === tipId);
    if (!tip) return sendJson(res, 404, { error: "tip not found" });
    return sendJson(res, 200, tip);
  }

  // GET /api/stats -- aggregate tip statistics
  if (req.method === "GET" && path === "/api/stats") {
    const allEvents = loadEvents();
    const tips = allEvents.map(parseTipEvent).filter(Boolean);
    const totalVolume = tips.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalFees = tips.reduce((sum, t) => sum + (t.fee || 0), 0);
    return sendJson(res, 200, {
      totalTips: tips.length,
      totalVolume,
      totalFees,
      uniqueSenders: new Set(tips.map((t) => t.sender)).size,
      uniqueRecipients: new Set(tips.map((t) => t.recipient)).size,
    });
  }

  // GET /api/admin/events -- admin event log
  if (req.method === "GET" && path === "/api/admin/events") {
    const allEvents = loadEvents();
    const adminEvents = allEvents
      .map(parseAdminEvent)
      .filter(Boolean)
      .reverse();
    return sendJson(res, 200, { events: adminEvents, total: adminEvents.length });
  }

  // GET /api/admin/bypasses -- detected timelock bypass events
  if (req.method === "GET" && path === "/api/admin/bypasses") {
    const allEvents = loadEvents();
    const bypasses = [];
    for (let i = 0; i < allEvents.length; i++) {
      const detection = detectBypass(allEvents[i], allEvents.slice(Math.max(0, i - 50), i));
      if (detection.isBypass) {
        bypasses.push({
          ...detection,
          txId: allEvents[i].txId,
          blockHeight: allEvents[i].blockHeight,
          timestamp: allEvents[i].timestamp,
        });
      }
    }
    return sendJson(res, 200, { bypasses, total: bypasses.length });
  }

  sendJson(res, 404, { error: "not found", path: path });
});

export { server };

// Only start listening when executed directly (not imported by tests).
const isMain =
  process.argv[1] &&
  import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  server.listen(PORT, () => {
    console.log(`Chainhook callback server running on port ${PORT}`);
    console.log(`Auth: ${AUTH_TOKEN ? "enabled" : "disabled"}`);
  });
}
