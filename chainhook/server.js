import http from "node:http";
import { randomUUID } from "node:crypto";
import { detectBypass, parseAdminEvent, formatBypassAlert } from "./bypass-detection.js";
import { MAX_BODY_SIZE, isValidStacksAddress, sanitizeQueryInt } from "./validation.js";
import { deduplicateEvents } from "./deduplication.js";
import { metrics } from "./metrics.js";
import { validateBearerToken } from "./auth.js";
import { parseAllowedOrigins, getCorsHeaders } from "./cors.js";
import { RateLimiter, getClientIp, validateRateLimitConfig, AddressRateLimiter, parseAddressWhitelist, validateAddressRateLimitConfig } from "./rate-limit.js";
import { logger } from "./logging.js";
import { setupGracefulShutdown, isShuttingDown } from "./graceful-shutdown.js";
import { createEventStore, createScheduledTipStore, createRefundStore, getRetentionCutoff, parseRetentionDays } from "./storage.js";
import { normalizeClarityEventFields } from "../shared/clarityValues.js";
import { BadRequestError, PayloadTooLargeError, RateLimitError, UnauthorizedError, ServiceUnavailableError, classifyError, toErrorResponse } from "./errors.js";
import { ScheduledTip, validateScheduledTipParams, SCHEDULED_TIP_STATUSES } from "./scheduler.js";
import { wsManager } from "./websocket.js";
import { REFUND_STATUSES, REFUND_WINDOW_MS } from "./storage.js";

const PORT = process.env.PORT || 3100;
const AUTH_TOKEN = process.env.CHAINHOOK_AUTH_TOKEN || "";
const METRICS_AUTH_TOKEN = process.env.METRICS_AUTH_TOKEN || "";
const HEALTH_CHECK_ALWAYS_ENABLED = process.env.HEALTH_CHECK_ALWAYS_ENABLED !== "false";
const STORAGE_MODE = process.env.CHAINHOOK_STORAGE || (process.env.NODE_ENV === "test" ? "memory" : "postgres");
const RETENTION_DAYS = parseRetentionDays(process.env.CHAINHOOK_RETENTION_DAYS, 30);
const DATABASE_URL = process.env.DATABASE_URL || "";

const CORS_ALLOWED_ORIGINS = parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10);
const rateLimiter = new RateLimiter(RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS);

const ADDRESS_RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.ADDRESS_RATE_LIMIT_MAX_REQUESTS || "50", 10);
const ADDRESS_RATE_LIMIT_WINDOW_MS = parseInt(process.env.ADDRESS_RATE_LIMIT_WINDOW_MS || "60000", 10);
const ADDRESS_RATE_LIMIT_WHITELIST = parseAddressWhitelist(process.env.ADDRESS_RATE_LIMIT_WHITELIST || "");
const addressRateLimiter = new AddressRateLimiter(
  ADDRESS_RATE_LIMIT_MAX_REQUESTS,
  ADDRESS_RATE_LIMIT_WINDOW_MS,
  ADDRESS_RATE_LIMIT_WHITELIST
);
let eventStore = null;
let scheduledTipStore = null;
let refundStore = null;

/**
 * Get the rate limiter instance for runtime configuration.
 * Exposed for admin endpoints to query and update configuration.
 * 
 * @returns {RateLimiter} The active rate limiter instance
 */
function getRateLimiter() {
  return rateLimiter;
}

function getAddressRateLimiter() {
  return addressRateLimiter;
}

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

async function getScheduledTipStore() {
  if (!scheduledTipStore) {
    if (STORAGE_MODE === "postgres" && !DATABASE_URL) {
      throw new Error("DATABASE_URL is required when CHAINHOOK_STORAGE=postgres");
    }
    scheduledTipStore = await createScheduledTipStore({
      mode: STORAGE_MODE,
      databaseUrl: DATABASE_URL,
    });
    await scheduledTipStore.init();
  }
  return scheduledTipStore;
}

async function getRefundStore() {
  if (!refundStore) {
    if (STORAGE_MODE === "postgres" && !DATABASE_URL) {
      throw new Error("DATABASE_URL is required when CHAINHOOK_STORAGE=postgres");
    }
    refundStore = await createRefundStore({
      mode: STORAGE_MODE,
      databaseUrl: DATABASE_URL,
    });
    await refundStore.init();
  }
  return refundStore;
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
    let settled = false;

    req.on("data", (chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        settled = true;
        req.pause();
        reject(new Error("Request body too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (settled) return;
      settled = true;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    });
  });
}

/**
 * Extract on-chain events from a Chainhook webhook payload.
 * Filters for SmartContractEvent and print_event types only.
 * @param {object} payload - The parsed Chainhook webhook body.
 * @returns {Array<object>} Extracted event objects.
 */
function validatePayloadStructure(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, reason: 'payload must be an object' };
  }
  
  if (!Array.isArray(payload.apply)) {
    return { valid: false, reason: 'payload.apply must be an array' };
  }
  
  return { valid: true };
}

function validateBlock(block, blockIndex) {
  if (!block || typeof block !== 'object') {
    return { valid: false, reason: `block at index ${blockIndex} must be an object` };
  }
  
  if (!block.block_identifier || typeof block.block_identifier !== 'object') {
    return { valid: false, reason: `block at index ${blockIndex} missing block_identifier` };
  }
  
  if (typeof block.block_identifier.index !== 'number') {
    return { valid: false, reason: `block at index ${blockIndex} missing block_identifier.index` };
  }
  
  return { valid: true };
}

function validateTransaction(tx, blockIndex, txIndex) {
  if (!tx || typeof tx !== 'object') {
    return { valid: false, reason: `transaction at block ${blockIndex}, tx ${txIndex} must be an object` };
  }
  
  if (!tx.transaction_identifier || typeof tx.transaction_identifier !== 'object') {
    return { valid: false, reason: `transaction at block ${blockIndex}, tx ${txIndex} missing transaction_identifier` };
  }
  
  if (!tx.transaction_identifier.hash) {
    return { valid: false, reason: `transaction at block ${blockIndex}, tx ${txIndex} missing transaction_identifier.hash` };
  }
  
  return { valid: true };
}

function extractEvents(payload) {
  const validation = validatePayloadStructure(payload);
  if (!validation.valid) {
    throw new BadRequestError(`invalid payload structure: ${validation.reason}`);
  }

  const events = [];
  const apply = payload.apply || [];
  
  for (let blockIndex = 0; blockIndex < apply.length; blockIndex++) {
    const block = apply[blockIndex];
    const blockValidation = validateBlock(block, blockIndex);
    if (!blockValidation.valid) {
      throw new BadRequestError(`invalid block structure: ${blockValidation.reason}`);
    }

    const transactions = block.transactions || [];
    for (let txIndex = 0; txIndex < transactions.length; txIndex++) {
      const tx = transactions[txIndex];
      const txValidation = validateTransaction(tx, blockIndex, txIndex);
      if (!txValidation.valid) {
        throw new BadRequestError(`invalid transaction structure: ${txValidation.reason}`);
      }

      const metadata = tx.metadata || {};
      const receipt = metadata.receipt || {};
      const printEvents = receipt.events || [];

      for (const evt of printEvents) {
        if (evt.type !== "SmartContractEvent" && evt.type !== "print_event") continue;
        const data = evt.data || evt.contract_event || {};
        const value = data.value || data.raw_value;
        
        if (!value) {
          logger.warn('Event missing value field', {
            block_height: block.block_identifier.index,
            tx_id: tx.transaction_identifier.hash,
            event_type: evt.type,
          });
          continue;
        }

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
function sendJson(res, statusCode, data, headers = {}) {
  res.writeHead(statusCode, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(data));
}

function sendError(res, error, requestId, context = {}) {
  const { statusCode, body, classified } = toErrorResponse(error, requestId);
  const headers = { 'X-Request-Id': requestId };
  if (statusCode === 429) {
    headers['Retry-After'] = String(classified.details?.retryAfter || 60);
  }
  if (statusCode === 503) {
    headers['Retry-After'] = '30';
  }
  const logContext = {
    request_id: requestId,
    error_code: classified.code,
    error_category: classified.category,
    error_message: classified.message,
    ...context,
  };

  if (statusCode >= 500) {
    logger.error('Request failed', classified, logContext);
  } else {
    logger.warn('Request rejected', logContext);
  }

  return sendJson(res, statusCode, body, headers);
}

/**
 * Parse a raw on-chain event into a structured tip object.
 * Returns null if the event is not a tip-sent event.
 * @param {object} event - A raw event from extractEvents.
 * @returns {object|null}
 */
function parseTipEvent(event) {
  const val = normalizeClarityEventFields(event.event);
  if (!val) return null;
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

export { parseBody, extractEvents, parseTipEvent, sendJson, getEventStore, checkShutdownState, validatePayloadStructure, validateBlock, validateTransaction, getRateLimiter, getAddressRateLimiter, wsManager, getRefundStore };

function checkShutdownState(res, requestId) {
  if (isShuttingDown()) {
    metrics.recordRequest(false);
    sendError(
      res,
      new ServiceUnavailableError('service is shutting down'),
      requestId,
      { shutdown: true }
    );
    return true;
  }
  return false;
}

const server = http.createServer(async (req, res) => {
  const requestId = randomUUID();
  res.setHeader("X-Request-Id", requestId);
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const origin = req.headers.origin || "";

  const corsHeaders = getCorsHeaders(origin, CORS_ALLOWED_ORIGINS);
  for (const [key, value] of Object.entries(corsHeaders)) {
    res.setHeader(key, value);
  }

  logger.logRequest(req, { request_id: requestId });

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // POST /api/chainhook/events -- ingest webhook payloads
  if (req.method === "POST" && path === "/api/chainhook/events") {
    if (checkShutdownState(res, requestId)) {
      return;
    }

    const clientIp = getClientIp(req);
    const startTime = Date.now();

    if (!rateLimiter.isAllowed(clientIp)) {
      metrics.recordRequest(false);
      const remaining = rateLimiter.getRemaining(clientIp);
      return sendError(
        res,
        new RateLimitError("rate limit exceeded", { remaining, ip: clientIp }),
        requestId,
        { ip: clientIp, remaining },
      );
    }

    const contentLength = parseInt(req.headers["content-length"], 10);
    if (contentLength > MAX_BODY_SIZE) {
      metrics.recordRequest(false);
      return sendError(
        res,
        new PayloadTooLargeError("payload too large", { ip: clientIp, size: contentLength }),
        requestId,
        { ip: clientIp, size: contentLength },
      );
    }

    if (AUTH_TOKEN) {
      const authHeader = req.headers.authorization || "";
      if (!validateBearerToken(authHeader, AUTH_TOKEN)) {
        metrics.recordRequest(false);
        return sendError(
          res,
          new UnauthorizedError("unauthorized", { ip: clientIp }),
          requestId,
          { ip: clientIp },
        );
      }
    }

    try {
      const store = await getEventStore();
      const payload = await parseBody(req);
      const newEvents = extractEvents(payload);
      let insertedCount = 0;
      let duplicateCount = 0;

      for (const evt of newEvents) {
        const tip = parseTipEvent(evt);
        if (tip && tip.sender) {
          if (!addressRateLimiter.isAllowed(tip.sender)) {
            metrics.recordRequest(false);
            const remaining = addressRateLimiter.getRemaining(tip.sender);
            return sendError(
              res,
              new RateLimitError("address rate limit exceeded", { remaining, address: tip.sender }),
              requestId,
              { address: tip.sender, remaining },
            );
          }
        }
      }
      
      if (newEvents.length > 0) {
        const existingEvents = await store.listEvents();
        const { deduplicated, duplicateCount: existingDuplicateCount } = deduplicateEvents(newEvents, existingEvents);

        for (const evt of deduplicated) {
          const detection = detectBypass(evt, existingEvents.slice(-50));
          if (detection.isBypass) {
            logger.warn("Bypass detected", { detection, txId: evt.txId, request_id: requestId });
          }
          const adminEvt = parseAdminEvent(evt);
          if (adminEvt) {
            logger.info("Admin event indexed", {
              event_type: adminEvt.eventType,
              block_height: adminEvt.blockHeight,
              request_id: requestId,
            });
          }
        }

        const result = await store.insertEvents(deduplicated);
        const totalDuplicates = existingDuplicateCount + result.duplicateCount;
        insertedCount = result.insertedCount;
        duplicateCount = totalDuplicates;
        await store.pruneExpired(getRetentionCutoff(RETENTION_DAYS));

        for (const evt of deduplicated) {
          const tip = parseTipEvent(evt);
          if (tip) {
            wsManager.broadcast(tip);
          }
        }

        const processingMs = Date.now() - startTime;
        metrics.recordEventIndex(insertedCount, duplicateCount, processingMs);
        logger.info("Events indexed", {
          indexed: insertedCount,
          duplicates: duplicateCount,
          total: result.totalCount,
          processing_ms: processingMs,
          storage_mode: STORAGE_MODE,
          request_id: requestId,
        });
      }
      
      metrics.recordRequest(true);
      const processingMs = Date.now() - startTime;
      logger.logResponse(req, 200, processingMs, {
        indexed: insertedCount,
        duplicates: duplicateCount,
        storage_mode: STORAGE_MODE,
        request_id: requestId,
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
      const classified = classifyError(err);
      return sendError(res, classified, requestId, {
        ip: clientIp,
        processing_ms: processingMs,
      });
    }
  }

  // GET /api/tips -- paginated list of parsed tips
  if (req.method === "GET" && path === "/api/tips") {
    const store = await getEventStore();
    const limit = sanitizeQueryInt(url.searchParams.get("limit") || "50", 1, 100);
    const cursor = url.searchParams.get("cursor") || null;

    if (isNaN(limit)) {
      return sendError(res, new BadRequestError("limit must be between 1 and 100"), requestId, {
        path,
        query: "limit",
      });
    }

    const result = await store.listTips({ limit, cursor });
    const tips = result.events.map(parseTipEvent).filter(Boolean);

    return sendJson(res, 200, {
      tips,
      total: result.total,
      nextCursor: result.nextCursor,
    });
  }

  // GET /api/tips/user/:address -- tips sent or received by address
  // Uses optimized database query with JSONB indexes for fast lookups
  if (req.method === "GET" && path.startsWith("/api/tips/user/")) {
    const store = await getEventStore();
    const address = path.split("/api/tips/user/")[1];
    
    if (!address || address.trim() === "") {
      return sendError(res, new BadRequestError("address parameter is required"), requestId, {
        path,
      });
    }
    
    if (!isValidStacksAddress(address)) {
      return sendError(res, new BadRequestError("invalid address format"), requestId, {
        path,
        address,
      });
    }
    
    const userEvents = await store.listEventsByUser(address);
    const tips = userEvents
      .map(parseTipEvent)
      .filter(Boolean)
      .reverse();
    return sendJson(res, 200, { tips, total: tips.length });
  }

  // GET /api/tips/:id -- single tip by numeric ID
  if (req.method === "GET" && path.match(/^\/api\/tips\/\d+$/)) {
    const store = await getEventStore();
    const tipId = parseInt(path.split("/api/tips/")[1], 10);
    if (isNaN(tipId) || tipId < 0) {
      return sendError(res, new BadRequestError("invalid tip ID"), requestId, {
        path,
        tip_id: path.split("/api/tips/")[1],
      });
    }
    const allEvents = await store.listEvents();
    const tip = allEvents.map(parseTipEvent).find((t) => t && Number(t.tipId) === tipId);
    if (!tip) return sendJson(res, 404, { error: "tip not found" });
    return sendJson(res, 200, tip);
  }

  // GET /api/stats -- aggregate tip statistics
  if (req.method === "GET" && path === "/api/stats") {
    const store = await getEventStore();
    const allEvents = await store.listEvents();
    const tips = allEvents.map(parseTipEvent).filter(Boolean);
    const totalVolume = tips.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalFees = tips.reduce((sum, t) => sum + Number(t.fee || 0), 0);
    return sendJson(res, 200, {
      totalTips: tips.length,
      totalVolume,
      totalFees,
      uniqueSenders: new Set(tips.map((t) => t.sender)).size,
      uniqueRecipients: new Set(tips.map((t) => t.recipient)).size,
    });
  }

  // POST /api/scheduled-tips -- create a scheduled tip
  if (req.method === "POST" && path === "/api/scheduled-tips") {
    const startTime = Date.now();

    try {
      const body = await parseBody(req);
      const validation = validateScheduledTipParams(body);

      if (!validation.valid) {
        return sendError(res, new BadRequestError(validation.error), requestId, { path });
      }

      const scheduledTip = new ScheduledTip({
        sender: body.sender,
        recipient: body.recipient,
        amount: body.amount,
        scheduledFor: body.scheduledFor,
        message: body.message || '',
        category: body.category ?? 0,
      });

      const store = await getScheduledTipStore();
      const result = await store.insertScheduledTip(scheduledTip);

      if (!result.inserted) {
        return sendError(res, new BadRequestError('Scheduled tip with this ID already exists'), requestId, { path });
      }

      const processingMs = Date.now() - startTime;
      logger.info('Scheduled tip created', {
        id: scheduledTip.id,
        sender: scheduledTip.sender,
        recipient: scheduledTip.recipient,
        scheduled_for: scheduledTip.scheduledFor.toISOString(),
        request_id: requestId,
        processing_ms: processingMs,
      });

      metrics.recordRequest(true);
      return sendJson(res, 201, { ok: true, scheduledTip: result.tip });
    } catch (err) {
      const processingMs = Date.now() - startTime;
      metrics.recordRequest(false);
      return sendError(res, err, requestId, { path, processing_ms: processingMs });
    }
  }

  // GET /api/scheduled-tips -- list scheduled tips with filters
  if (req.method === "GET" && path === "/api/scheduled-tips") {
    try {
      const sender = url.searchParams.get("sender");
      const recipient = url.searchParams.get("recipient");
      const status = url.searchParams.get("status");
      const limit = sanitizeQueryInt(url.searchParams.get("limit") || "50", 1, 100);
      const offset = sanitizeQueryInt(url.searchParams.get("offset") || "0", 0, Number.MAX_SAFE_INTEGER);

      if (isNaN(limit)) {
        return sendError(res, new BadRequestError("limit must be between 1 and 100"), requestId, { path });
      }
      if (isNaN(offset)) {
        return sendError(res, new BadRequestError("offset must be a non-negative integer"), requestId, { path });
      }

      const store = await getScheduledTipStore();
      const result = await store.listScheduledTips({ sender, recipient, status, limit, offset });

      return sendJson(res, 200, { scheduledTips: result.tips, total: result.total });
    } catch (err) {
      return sendError(res, err, requestId, { path });
    }
  }

  // GET /api/scheduled-tips/:id -- get a single scheduled tip
  if (req.method === "GET" && path.match(/^\/api\/scheduled-tips\/[a-f0-9-]+$/)) {
    try {
      const id = path.split("/api/scheduled-tips/")[1];
      const store = await getScheduledTipStore();
      const tip = await store.getScheduledTip(id);

      if (!tip) {
        return sendJson(res, 404, { error: "scheduled tip not found" });
      }

      return sendJson(res, 200, tip);
    } catch (err) {
      return sendError(res, err, requestId, { path });
    }
  }

  // DELETE /api/scheduled-tips/:id -- cancel a scheduled tip
  if (req.method === "DELETE" && path.match(/^\/api\/scheduled-tips\/[a-f0-9-]+$/)) {
    const startTime = Date.now();

    try {
      const id = path.split("/api/scheduled-tips/")[1];
      const body = await parseBody(req);

      if (!body.sender || typeof body.sender !== 'string') {
        return sendError(res, new BadRequestError('sender address is required'), requestId, { path });
      }

      const store = await getScheduledTipStore();
      const result = await store.cancelScheduledTip(id, body.sender);

      if (!result.cancelled) {
        if (result.reason === 'not_found') {
          return sendJson(res, 404, { error: "scheduled tip not found or you are not the sender" });
        }
        if (result.reason === 'not_pending') {
          return sendError(res, new BadRequestError('can only cancel pending scheduled tips'), requestId, { path });
        }
      }

      const processingMs = Date.now() - startTime;
      logger.info('Scheduled tip cancelled', {
        id,
        sender: body.sender,
        request_id: requestId,
        processing_ms: processingMs,
      });

      metrics.recordRequest(true);
      return sendJson(res, 200, { ok: true, scheduledTip: result.tip });
    } catch (err) {
      const processingMs = Date.now() - startTime;
      metrics.recordRequest(false);
      return sendError(res, err, requestId, { path, processing_ms: processingMs });
    }
  }

  // POST /api/refunds -- create a refund request
  if (req.method === "POST" && path === "/api/refunds") {
    const startTime = Date.now();

    try {
      const body = await parseBody(req);
      const { tipId, txId, sender, recipient, amount, reason } = body;

      if (!tipId || typeof tipId !== 'string') {
        return sendError(res, new BadRequestError('tipId is required'), requestId, { path });
      }
      if (!txId || typeof txId !== 'string') {
        return sendError(res, new BadRequestError('txId is required'), requestId, { path });
      }
      if (!sender || typeof sender !== 'string') {
        return sendError(res, new BadRequestError('sender address is required'), requestId, { path });
      }
      if (!isValidStacksAddress(sender)) {
        return sendError(res, new BadRequestError('invalid sender address format'), requestId, { path });
      }
      if (!recipient || typeof recipient !== 'string') {
        return sendError(res, new BadRequestError('recipient address is required'), requestId, { path });
      }
      if (!isValidStacksAddress(recipient)) {
        return sendError(res, new BadRequestError('invalid recipient address format'), requestId, { path });
      }
      const amountNum = Number(amount);
      if (!amount || isNaN(amountNum) || amountNum <= 0) {
        return sendError(res, new BadRequestError('amount must be a positive number'), requestId, { path });
      }

      const store = await getRefundStore();

      const existing = await store.getRefundRequest(tipId);
      if (existing) {
        return sendError(res, new BadRequestError('a refund request already exists for this tip'), requestId, { path });
      }

      const request = {
        tipId,
        txId,
        sender,
        recipient,
        amount: amountNum,
        status: REFUND_STATUSES.PENDING,
        reason: reason || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await store.insertRefundRequest(request);

      const processingMs = Date.now() - startTime;
      logger.info('Refund request created', {
        tip_id: tipId,
        sender,
        recipient,
        request_id: requestId,
        processing_ms: processingMs,
      });

      metrics.recordRequest(true);
      return sendJson(res, 201, { ok: true, refundRequest: result.request });
    } catch (err) {
      const processingMs = Date.now() - startTime;
      metrics.recordRequest(false);
      return sendError(res, err, requestId, { path, processing_ms: processingMs });
    }
  }

  // GET /api/refunds -- list refund requests with optional filters
  if (req.method === "GET" && path === "/api/refunds") {
    try {
      const sender = url.searchParams.get("sender");
      const recipient = url.searchParams.get("recipient");
      const status = url.searchParams.get("status");
      const limit = sanitizeQueryInt(url.searchParams.get("limit") || "50", 1, 100);
      const offset = sanitizeQueryInt(url.searchParams.get("offset") || "0", 0, Number.MAX_SAFE_INTEGER);

      if (isNaN(limit)) {
        return sendError(res, new BadRequestError("limit must be between 1 and 100"), requestId, { path });
      }
      if (isNaN(offset)) {
        return sendError(res, new BadRequestError("offset must be a non-negative integer"), requestId, { path });
      }

      if (sender && !isValidStacksAddress(sender)) {
        return sendError(res, new BadRequestError("invalid sender address format"), requestId, { path });
      }
      if (recipient && !isValidStacksAddress(recipient)) {
        return sendError(res, new BadRequestError("invalid recipient address format"), requestId, { path });
      }
      if (status && !Object.values(REFUND_STATUSES).includes(status)) {
        return sendError(res, new BadRequestError("invalid status value"), requestId, { path });
      }

      const store = await getRefundStore();
      const result = await store.listRefundRequests({ sender, recipient, status, limit, offset });

      return sendJson(res, 200, { refundRequests: result.requests, total: result.total });
    } catch (err) {
      return sendError(res, err, requestId, { path });
    }
  }

  // GET /api/refunds/:tipId -- get a single refund request
  if (req.method === "GET" && path.match(/^\/api\/refunds\/[^/]+$/)) {
    try {
      const tipId = path.split("/api/refunds/")[1];
      const store = await getRefundStore();
      const request = await store.getRefundRequest(tipId);

      if (!request) {
        return sendJson(res, 404, { error: "refund request not found" });
      }

      return sendJson(res, 200, request);
    } catch (err) {
      return sendError(res, err, requestId, { path });
    }
  }

  // PATCH /api/refunds/:tipId -- approve or reject a refund request
  if (req.method === "PATCH" && path.match(/^\/api\/refunds\/[^/]+$/)) {
    const startTime = Date.now();

    try {
      const tipId = path.split("/api/refunds/")[1];
      const body = await parseBody(req);
      const { action, recipient, refundTxId } = body;

      if (!action || !['approve', 'reject'].includes(action)) {
        return sendError(res, new BadRequestError("action must be 'approve' or 'reject'"), requestId, { path });
      }
      if (!recipient || typeof recipient !== 'string') {
        return sendError(res, new BadRequestError('recipient address is required'), requestId, { path });
      }
      if (!isValidStacksAddress(recipient)) {
        return sendError(res, new BadRequestError('invalid recipient address format'), requestId, { path });
      }

      const store = await getRefundStore();
      const existing = await store.getRefundRequest(tipId);

      if (!existing) {
        return sendJson(res, 404, { error: "refund request not found" });
      }
      if (existing.recipient !== recipient) {
        return sendError(res, new BadRequestError('only the tip recipient can approve or reject a refund'), requestId, { path });
      }
      if (existing.status !== REFUND_STATUSES.PENDING) {
        return sendError(res, new BadRequestError('refund request is no longer pending'), requestId, { path });
      }

      const newStatus = action === 'approve' ? REFUND_STATUSES.APPROVED : REFUND_STATUSES.REJECTED;
      const updates = {
        status: newStatus,
        resolvedAt: new Date(),
      };
      if (action === 'approve' && refundTxId) {
        updates.refundTxId = refundTxId;
      }

      const result = await store.updateRefundRequest(tipId, updates);

      const processingMs = Date.now() - startTime;
      logger.info('Refund request updated', {
        tip_id: tipId,
        action,
        recipient,
        request_id: requestId,
        processing_ms: processingMs,
      });

      metrics.recordRequest(true);
      return sendJson(res, 200, { ok: true, refundRequest: result.request });
    } catch (err) {
      const processingMs = Date.now() - startTime;
      metrics.recordRequest(false);
      return sendError(res, err, requestId, { path, processing_ms: processingMs });
    }
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

  // GET /api/admin/rate-limit -- get current rate limit configuration
  if (req.method === "GET" && path === "/api/admin/rate-limit") {
    if (AUTH_TOKEN) {
      const authHeader = req.headers.authorization || "";
      if (!validateBearerToken(authHeader, AUTH_TOKEN)) {
        return sendError(
          res,
          new UnauthorizedError("unauthorized"),
          requestId,
          { path }
        );
      }
    }
    const config = rateLimiter.getConfig();
    logger.logResponse(req, 200, 0, {
      request_id: requestId,
      max_requests: config.maxRequests,
      window_ms: config.windowMs,
    });
    return sendJson(res, 200, {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      windowSeconds: Math.round(config.windowMs / 1000),
    });
  }

  // POST /api/admin/rate-limit -- update rate limit configuration
  if (req.method === "POST" && path === "/api/admin/rate-limit") {
    const startTime = Date.now();
    
    if (AUTH_TOKEN) {
      const authHeader = req.headers.authorization || "";
      if (!validateBearerToken(authHeader, AUTH_TOKEN)) {
        return sendError(
          res,
          new UnauthorizedError("unauthorized"),
          requestId,
          { path }
        );
      }
    }

    try {
      const body = await parseBody(req);
      const maxRequests = parseInt(body.maxRequests, 10);
      const windowMs = parseInt(body.windowMs, 10);

      const validation = validateRateLimitConfig(maxRequests, windowMs);
      if (!validation.valid) {
        return sendError(
          res,
          new BadRequestError(validation.error),
          requestId,
          { path, maxRequests: body.maxRequests, windowMs: body.windowMs }
        );
      }

      const oldConfig = rateLimiter.getConfig();
      rateLimiter.updateConfig(maxRequests, windowMs);
      const newConfig = rateLimiter.getConfig();

      const processingMs = Date.now() - startTime;

      logger.info("Rate limit configuration updated", {
        old_max_requests: oldConfig.maxRequests,
        old_window_ms: oldConfig.windowMs,
        new_max_requests: newConfig.maxRequests,
        new_window_ms: newConfig.windowMs,
        request_id: requestId,
        processing_ms: processingMs,
      });

      metrics.recordRequest(true);
      
      logger.logResponse(req, 200, processingMs, {
        request_id: requestId,
        old_max_requests: oldConfig.maxRequests,
        new_max_requests: newConfig.maxRequests,
      });

      return sendJson(res, 200, {
        ok: true,
        previous: {
          maxRequests: oldConfig.maxRequests,
          windowMs: oldConfig.windowMs,
        },
        current: {
          maxRequests: newConfig.maxRequests,
          windowMs: newConfig.windowMs,
          windowSeconds: Math.round(newConfig.windowMs / 1000),
        },
      });
    } catch (err) {
      const processingMs = Date.now() - startTime;
      metrics.recordRequest(false);
      return sendError(res, err, requestId, { path, processing_ms: processingMs });
    }
  }

  // GET /api/admin/address-rate-limit -- get current address rate limit configuration
  if (req.method === "GET" && path === "/api/admin/address-rate-limit") {
    if (AUTH_TOKEN) {
      const authHeader = req.headers.authorization || "";
      if (!validateBearerToken(authHeader, AUTH_TOKEN)) {
        return sendError(res, new UnauthorizedError("unauthorized"), requestId, { path });
      }
    }
    const config = addressRateLimiter.getConfig();
    return sendJson(res, 200, {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      windowSeconds: Math.round(config.windowMs / 1000),
      whitelistSize: config.whitelistSize,
    });
  }

  // POST /api/admin/address-rate-limit -- update address rate limit configuration
  if (req.method === "POST" && path === "/api/admin/address-rate-limit") {
    const startTime = Date.now();

    if (AUTH_TOKEN) {
      const authHeader = req.headers.authorization || "";
      if (!validateBearerToken(authHeader, AUTH_TOKEN)) {
        return sendError(res, new UnauthorizedError("unauthorized"), requestId, { path });
      }
    }

    try {
      const body = await parseBody(req);
      const maxRequests = parseInt(body.maxRequests, 10);
      const windowMs = parseInt(body.windowMs, 10);

      const validation = validateAddressRateLimitConfig(maxRequests, windowMs);
      if (!validation.valid) {
        return sendError(
          res,
          new BadRequestError(validation.error),
          requestId,
          { path, maxRequests: body.maxRequests, windowMs: body.windowMs }
        );
      }

      const oldConfig = addressRateLimiter.getConfig();
      addressRateLimiter.updateConfig(maxRequests, windowMs);
      const newConfig = addressRateLimiter.getConfig();

      const processingMs = Date.now() - startTime;
      logger.info("Address rate limit configuration updated", {
        old_max_requests: oldConfig.maxRequests,
        old_window_ms: oldConfig.windowMs,
        new_max_requests: newConfig.maxRequests,
        new_window_ms: newConfig.windowMs,
        request_id: requestId,
        processing_ms: processingMs,
      });

      metrics.recordRequest(true);
      return sendJson(res, 200, {
        ok: true,
        previous: {
          maxRequests: oldConfig.maxRequests,
          windowMs: oldConfig.windowMs,
        },
        current: {
          maxRequests: newConfig.maxRequests,
          windowMs: newConfig.windowMs,
          windowSeconds: Math.round(newConfig.windowMs / 1000),
          whitelistSize: newConfig.whitelistSize,
        },
      });
    } catch (err) {
      const processingMs = Date.now() - startTime;
      metrics.recordRequest(false);
      return sendError(res, err, requestId, { path, processing_ms: processingMs });
    }
  }

  // GET /api/admin/address-rate-limit/whitelist -- list whitelisted addresses
  if (req.method === "GET" && path === "/api/admin/address-rate-limit/whitelist") {
    if (AUTH_TOKEN) {
      const authHeader = req.headers.authorization || "";
      if (!validateBearerToken(authHeader, AUTH_TOKEN)) {
        return sendError(res, new UnauthorizedError("unauthorized"), requestId, { path });
      }
    }
    const whitelist = addressRateLimiter.getWhitelist();
    return sendJson(res, 200, { whitelist, total: whitelist.length });
  }

  // POST /api/admin/address-rate-limit/whitelist -- add an address to the whitelist
  if (req.method === "POST" && path === "/api/admin/address-rate-limit/whitelist") {
    const startTime = Date.now();

    if (AUTH_TOKEN) {
      const authHeader = req.headers.authorization || "";
      if (!validateBearerToken(authHeader, AUTH_TOKEN)) {
        return sendError(res, new UnauthorizedError("unauthorized"), requestId, { path });
      }
    }

    try {
      const body = await parseBody(req);
      const { address } = body;

      if (!address || typeof address !== 'string') {
        return sendError(res, new BadRequestError("address is required"), requestId, { path });
      }
      if (!isValidStacksAddress(address)) {
        return sendError(res, new BadRequestError("invalid address format"), requestId, { path });
      }

      addressRateLimiter.addToWhitelist(address);

      const processingMs = Date.now() - startTime;
      logger.info("Address added to rate limit whitelist", {
        address,
        request_id: requestId,
        processing_ms: processingMs,
      });

      metrics.recordRequest(true);
      return sendJson(res, 200, {
        ok: true,
        address,
        whitelist: addressRateLimiter.getWhitelist(),
      });
    } catch (err) {
      const processingMs = Date.now() - startTime;
      metrics.recordRequest(false);
      return sendError(res, err, requestId, { path, processing_ms: processingMs });
    }
  }

  // DELETE /api/admin/address-rate-limit/whitelist -- remove an address from the whitelist
  if (req.method === "DELETE" && path === "/api/admin/address-rate-limit/whitelist") {
    const startTime = Date.now();

    if (AUTH_TOKEN) {
      const authHeader = req.headers.authorization || "";
      if (!validateBearerToken(authHeader, AUTH_TOKEN)) {
        return sendError(res, new UnauthorizedError("unauthorized"), requestId, { path });
      }
    }

    try {
      const body = await parseBody(req);
      const { address } = body;

      if (!address || typeof address !== 'string') {
        return sendError(res, new BadRequestError("address is required"), requestId, { path });
      }
      if (!isValidStacksAddress(address)) {
        return sendError(res, new BadRequestError("invalid address format"), requestId, { path });
      }

      addressRateLimiter.removeFromWhitelist(address);

      const processingMs = Date.now() - startTime;
      logger.info("Address removed from rate limit whitelist", {
        address,
        request_id: requestId,
        processing_ms: processingMs,
      });

      metrics.recordRequest(true);
      return sendJson(res, 200, {
        ok: true,
        address,
        whitelist: addressRateLimiter.getWhitelist(),
      });
    } catch (err) {
      const processingMs = Date.now() - startTime;
      metrics.recordRequest(false);
      return sendError(res, err, requestId, { path, processing_ms: processingMs });
    }
  }

  // GET /health -- health check endpoint (always accessible for orchestration)
  if (req.method === "GET" && path === "/health") {
    const store = await getEventStore();
    const storage = await store.health();
    const status = storage.healthy ? "healthy" : "degraded";
    return sendJson(res, storage.healthy ? 200 : 503, {
      status,
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.round((Date.now() - metrics.startTime) / 1000),
      storage,
      retention_days: RETENTION_DAYS,
    });
  }

  // GET /metrics -- service metrics for monitoring (gated by optional auth)
  if (req.method === "GET" && path === "/metrics") {
    if (METRICS_AUTH_TOKEN) {
      const authHeader = req.headers.authorization || "";
      if (!validateBearerToken(authHeader, METRICS_AUTH_TOKEN)) {
        return sendJson(res, 401, { error: "unauthorized", message: "metrics access requires valid authentication token" });
      }
    }
    const store = await getEventStore();
    const storage = await store.getStats();
    return sendJson(res, 200, {
      ...metrics.toJSON(),
      storage,
    });
  }

  // GET /api/ws/stats -- WebSocket connection statistics
  if (req.method === "GET" && path === "/api/ws/stats") {
    return sendJson(res, 200, {
      connectedClients: wsManager.clientCount,
      timestamp: new Date().toISOString(),
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
      addressRateLimiter.cleanup();
      try {
        await store.pruneExpired(getRetentionCutoff(RETENTION_DAYS));
      } catch (error) {
        logger.warn("Retention sweep failed", { error: error.message });
      }
    }, 60000);

    wsManager.attach(server);

    setupGracefulShutdown(server, async () => {
      clearInterval(cleanupInterval);
      wsManager.close();
      await store.close();
      logger.info("Shutdown initiated");
    });

    server.listen(PORT, () => {
      logger.info("Chainhook service started", {
        port: PORT,
        auth_enabled: !!AUTH_TOKEN,
        cors_origins: CORS_ALLOWED_ORIGINS.join(", "),
        rate_limit: `${RATE_LIMIT_MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MS}ms`,
        address_rate_limit: `${ADDRESS_RATE_LIMIT_MAX_REQUESTS} requests per ${ADDRESS_RATE_LIMIT_WINDOW_MS}ms`,
        address_whitelist_size: ADDRESS_RATE_LIMIT_WHITELIST.length,
        storage_mode: STORAGE_MODE,
        retention_days: RETENTION_DAYS,
        db_retry_max_attempts: parseInt(process.env.DB_RETRY_MAX_ATTEMPTS || "5", 10),
        db_retry_base_delay_ms: parseInt(process.env.DB_RETRY_BASE_DELAY_MS || "200", 10),
        websocket: `ws://localhost:${PORT}/ws`,
      });
    });
  })().catch((error) => {
    logger.error("Failed to start chainhook service", error);
    process.exit(1);
  });
}
