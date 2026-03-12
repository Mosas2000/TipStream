import http from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { detectBypass, parseAdminEvent, formatBypassAlert } from "./bypass-detection.js";
import { MAX_BODY_SIZE, isValidStacksAddress, sanitizeQueryInt } from "./validation.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3100;
const AUTH_TOKEN = process.env.CHAINHOOK_AUTH_TOKEN || "";
const DATA_DIR = join(__dirname, "data");
const DB_FILE = join(DATA_DIR, "events.json");

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

function loadEvents() {
  if (!existsSync(DB_FILE)) return [];
  try {
    return JSON.parse(readFileSync(DB_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveEvents(events) {
  writeFileSync(DB_FILE, JSON.stringify(events, null, 2));
}

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

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

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

export { parseBody, extractEvents, parseTipEvent, sendJson };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === "POST" && path === "/api/chainhook/events") {
    // Early rejection based on Content-Length header
    const contentLength = parseInt(req.headers["content-length"], 10);
    if (contentLength > MAX_BODY_SIZE) {
      return sendJson(res, 413, { error: "payload too large" });
    }

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
        const stored = loadEvents();

        // Check for timelock bypass events
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

  if (req.method === "GET" && path === "/api/admin/events") {
    const allEvents = loadEvents();
    const adminEvents = allEvents
      .map(parseAdminEvent)
      .filter(Boolean)
      .reverse();
    return sendJson(res, 200, { events: adminEvents, total: adminEvents.length });
  }

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

  sendJson(res, 404, { error: "not found" });
});

export { server };

// Only start listening when executed directly (not imported by tests).
const isMain =
  process.argv[1] &&
  import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  server.listen(PORT, () => {
    console.log(`Chainhook callback server running on port ${PORT}`);
  });
}
