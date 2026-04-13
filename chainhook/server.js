import http from "node:http";
import { detectBypass, parseAdminEvent, formatBypassAlert } from "./bypass-detection.js";
import { MAX_BODY_SIZE, isValidStacksAddress, sanitizeQueryInt } from "./validation.js";
import { deduplicateEvents } from "./deduplication.js";
import { metrics } from "./metrics.js";
import { validateBearerToken } from "./auth.js";
import { parseAllowedOrigins, getCorsHeaders } from "./cors.js";
import { RateLimiter, getClientIp } from "./rate-limit.js";
import { logger } from "./logging.js";
import { setupGracefulShutdown } from "./graceful-shutdown.js";
import { createEventStore, getRetentionCutoff, parseRetentionDays } from "./storage.js";

const PORT = process.env.PORT || 3100;
const AUTH_TOKEN = process.env.CHAINHOOK_AUTH_TOKEN || "";
const STORAGE_MODE = process.env.CHAINHOOK_STORAGE || (process.env.NODE_ENV === "test" ? "memory" : "postgres");
const RETENTION_DAYS = parseRetentionDays(process.env.CHAINHOOK_RETENTION_DAYS, 30);
const DATABASE_URL = process.env.DATABASE_URL || "";

const CORS_ALLOWED_ORIGINS = parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10);
const rateLimiter = new RateLimiter(RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS);
let eventStore = null;

async function getEventStore() {
  if (!eventStore) {
    if (STORAGE_MODE === "postgres" && !DATABASE_URL) {
      throw new Error("DATABASE_URL is required when CHAINHOOK_STORAGE=postgres");
    }
    eventStore = await createEventStore({
      mode: STORAGE_MODE,
      databaseUrl: DATABASE_URL,
      retentionDays: RETENTION_DAYS,
    });
    await eventStore.init();
  }
  return eventStore;
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

export { parseBody, extractEvents, parseTipEvent, sendJson, getEventStore };

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
      const store = await getEventStore();
      const payload = await parseBody(req);
      const newEvents = extractEvents(payload);
      let insertedCount = 0;
      let duplicateCount = 0;
      
      if (newEvents.length > 0) {
        const existingEvents = await store.listEvents();
        const { deduplicated, duplicateCount: existingDuplicateCount } = deduplicateEvents(newEvents, existingEvents);

        for (const evt of deduplicated) {
          const detection = detectBypass(evt, existingEvents.slice(-50));
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

        const result = await store.insertEvents(deduplicated);
        const totalDuplicates = existingDuplicateCount + result.duplicateCount;
        insertedCount = result.insertedCount;
        duplicateCount = totalDuplicates;
        await store.pruneExpired(getRetentionCutoff(RETENTION_DAYS));

        const processingMs = Date.now() - startTime;
        metrics.recordEventIndex(insertedCount, duplicateCount, processingMs);
        logger.info("Events indexed", {
          indexed: insertedCount,
          duplicates: duplicateCount,
          total: result.totalCount,
          processing_ms: processingMs,
          storage_mode: STORAGE_MODE,
        });
      }
      
      metrics.recordRequest(true);
      const processingMs = Date.now() - startTime;
      logger.logResponse(req, 200, processingMs, {
        indexed: insertedCount,
        duplicates: duplicateCount,
        storage_mode: STORAGE_MODE,
      });
      return sendJson(res, 200, {
        ok: true,
        received: newEvents.length,
        indexed: insertedCount,
        duplicates: duplicateCount,
      });
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
    const store = await getEventStore();
    const limit = sanitizeQueryInt(url.searchParams.get("limit") || "20", 1, 100);
    const offset = sanitizeQueryInt(url.searchParams.get("offset") || "0", 0, Number.MAX_SAFE_INTEGER);

    if (isNaN(limit)) {
      return sendJson(res, 400, { error: "limit must be between 1 and 100" });
    }
    if (isNaN(offset)) {
      return sendJson(res, 400, { error: "offset must be a non-negative integer" });
    }

    const allEvents = await store.listEvents();
    const tips = allEvents
      .map(parseTipEvent)
      .filter(Boolean)
      .reverse();
    const paged = tips.slice(offset, offset + limit);
    return sendJson(res, 200, { tips: paged, total: tips.length });
  }

  // GET /api/tips/user/:address -- tips sent or received by address
  if (req.method === "GET" && path.startsWith("/api/tips/user/")) {
    const store = await getEventStore();
    const address = path.split("/api/tips/user/")[1];
    if (!isValidStacksAddress(address)) {
      return sendJson(res, 400, { error: "invalid address format" });
    }
    const allEvents = await store.listEvents();
    const tips = allEvents
      .map(parseTipEvent)
      .filter((t) => t && (t.sender === address || t.recipient === address))
      .reverse();
    return sendJson(res, 200, { tips, total: tips.length });
  }

  // GET /api/tips/:id -- single tip by numeric ID
  if (req.method === "GET" && path.match(/^\/api\/tips\/\d+$/)) {
    const store = await getEventStore();
    const tipId = parseInt(path.split("/api/tips/")[1], 10);
    if (isNaN(tipId) || tipId < 0) {
      return sendJson(res, 400, { error: "invalid tip ID" });
    }
    const allEvents = await store.listEvents();
    const tip = allEvents.map(parseTipEvent).find((t) => t && t.tipId === tipId);
    if (!tip) return sendJson(res, 404, { error: "tip not found" });
    return sendJson(res, 200, tip);
  }

  // GET /api/stats -- aggregate tip statistics
  if (req.method === "GET" && path === "/api/stats") {
    const store = await getEventStore();
    const allEvents = await store.listEvents();
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
    const store = await getEventStore();
    const allEvents = await store.listEvents();
    const adminEvents = allEvents
      .map(parseAdminEvent)
      .filter(Boolean)
      .reverse();
    return sendJson(res, 200, { events: adminEvents, total: adminEvents.length });
  }

  // GET /api/admin/bypasses -- detected timelock bypass events
  if (req.method === "GET" && path === "/api/admin/bypasses") {
    const store = await getEventStore();
    const allEvents = await store.listEvents();
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
    const store = await getEventStore();
    const storage = await store.health();
    return sendJson(res, 200, {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.round((Date.now() - metrics.startTime) / 1000),
      storage,
      retention_days: RETENTION_DAYS,
    });
  }

  // GET /metrics -- service metrics for monitoring
  if (req.method === "GET" && path === "/metrics") {
    const store = await getEventStore();
    const storage = await store.getStats();
    return sendJson(res, 200, {
      ...metrics.toJSON(),
      storage,
    });
  }

  sendJson(res, 404, { error: "not found", path: path });
});

export { server };

const isMain =
  process.argv[1] &&
  import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  (async () => {
    const store = await getEventStore();
    const cleanupInterval = setInterval(async () => {
      rateLimiter.cleanup();
      try {
        await store.pruneExpired(getRetentionCutoff(RETENTION_DAYS));
      } catch (error) {
        logger.warn("Retention sweep failed", { error: error.message });
      }
    }, 60000);

    setupGracefulShutdown(server, async () => {
      clearInterval(cleanupInterval);
      await store.close();
      logger.info("Shutdown initiated");
    });

    server.listen(PORT, () => {
      logger.info("Chainhook service started", {
        port: PORT,
        auth_enabled: !!AUTH_TOKEN,
        cors_origins: CORS_ALLOWED_ORIGINS.join(", "),
        rate_limit: `${RATE_LIMIT_MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MS}ms`,
        storage_mode: STORAGE_MODE,
        retention_days: RETENTION_DAYS,
      });
    });
  })().catch((error) => {
    logger.error("Failed to start chainhook service", error);
    process.exit(1);
  });
}
