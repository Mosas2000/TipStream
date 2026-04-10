import http from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { detectBypass, parseAdminEvent, formatBypassAlert } from "./bypass-detection.js";
import { MAX_BODY_SIZE, isValidStacksAddress, sanitizeQueryInt } from "./validation.js";
import { generateEventKey, deduplicateEvents } from "./deduplication.js";
import { metrics } from "./metrics.js";
import { validateBearerToken } from "./auth.js";
import { parseAllowedOrigins, getCorsHeaders } from "./cors.js";
import { RateLimiter, getClientIp } from "./rate-limit.js";
import { logger } from "./logging.js";
import { setupGracefulShutdown } from "./graceful-shutdown.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3100;
const AUTH_TOKEN = process.env.CHAINHOOK_AUTH_TOKEN || "";
const DATA_DIR = join(__dirname, "data");
const DB_FILE = join(DATA_DIR, "events.json");

const CORS_ALLOWED_ORIGINS = parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10);
const rateLimiter = new RateLimiter(RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS);

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
  const origin = req.headers.origin || "";

  const corsHeaders = getCorsHeaders(origin, CORS_ALLOWED_ORIGINS);
  for (const [key, value] of Object.entries(corsHeaders)) {
    res.setHeader(key, value);
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // POST /api/chainhook/events -- ingest webhook payloads
  if (req.method === "POST" && path === "/api/chainhook/events") {
    const clientIp = getClientIp(req);
    const startTime = Date.now();

    if (!rateLimiter.isAllowed(clientIp)) {
      metrics.recordRequest(false);
      const remaining = rateLimiter.getRemaining(clientIp);
      res.writeHead(429, { "Content-Type": "application/json", "Retry-After": "60" });
      logger.warn("Rate limit exceeded", { ip: clientIp, remaining });
      return res.end(JSON.stringify({ error: "rate limit exceeded" }));
    }

    const contentLength = parseInt(req.headers["content-length"], 10);
    if (contentLength > MAX_BODY_SIZE) {
      metrics.recordRequest(false);
      logger.warn("Payload too large", { ip: clientIp, size: contentLength });
      return sendJson(res, 413, { error: "payload too large" });
    }

    if (AUTH_TOKEN) {
      const authHeader = req.headers.authorization || "";
      if (!validateBearerToken(authHeader, AUTH_TOKEN)) {
        metrics.recordRequest(false);
        logger.warn("Unauthorized request", { ip: clientIp });
        return sendJson(res, 401, { error: "unauthorized" });
      }
    }

    try {
      const payload = await parseBody(req);
      const newEvents = extractEvents(payload);
      
      if (newEvents.length > 0) {
        await withEventLock(() => {
          const stored = loadEvents();
          const { deduplicated, duplicateCount } = deduplicateEvents(newEvents, stored);
          
          for (const evt of deduplicated) {
            const detection = detectBypass(evt, stored.slice(-50));
            if (detection.isBypass) {
              logger.warn("Bypass detected", { detection, txId: evt.txId });
            }
            const adminEvt = parseAdminEvent(evt);
            if (adminEvt) {
              logger.info("Admin event indexed", {
                event_type: adminEvt.eventType,
                block_height: adminEvt.blockHeight,
              });
            }
          }

          stored.push(...deduplicated);
          saveEvents(stored);
          
          const processingMs = Date.now() - startTime;
          metrics.recordEventIndex(deduplicated.length, duplicateCount, processingMs);
          logger.info("Events indexed", {
            indexed: deduplicated.length,
            duplicates: duplicateCount,
            total: stored.length,
            processing_ms: processingMs,
          });
        });
      }
      
      metrics.recordRequest(true);
      const processingMs = Date.now() - startTime;
      logger.logResponse(req, 200, processingMs, { indexed: newEvents.length });
      return sendJson(res, 200, { ok: true, indexed: newEvents.length });
    } catch (err) {
      metrics.recordRequest(false);
      const processingMs = Date.now() - startTime;
      logger.error("Failed to process chainhook payload", err, { ip: clientIp, processing_ms: processingMs });
      
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

  // GET /health -- health check endpoint
  if (req.method === "GET" && path === "/health") {
    return sendJson(res, 200, {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.round((Date.now() - metrics.startTime) / 1000),
    });
  }

  // GET /metrics -- service metrics for monitoring
  if (req.method === "GET" && path === "/metrics") {
    return sendJson(res, 200, metrics.toJSON());
  }

  sendJson(res, 404, { error: "not found", path: path });
});

export { server };

const isMain =
  process.argv[1] &&
  import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  const cleanupInterval = setInterval(() => {
    rateLimiter.cleanup();
  }, 60000);

  setupGracefulShutdown(server, async () => {
    clearInterval(cleanupInterval);
    logger.info("Shutdown initiated");
  });

  server.listen(PORT, () => {
    logger.info("Chainhook service started", {
      port: PORT,
      auth_enabled: !!AUTH_TOKEN,
      cors_origins: CORS_ALLOWED_ORIGINS.join(", "),
      rate_limit: `${RATE_LIMIT_MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MS}ms`,
    });
  });
}
