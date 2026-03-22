import { isProduction, getEnvironment } from './telemetry-env';
import { buildExportPayload } from './telemetry-export';

const DEFAULT_CONFIG = {
  enabled: false,
  endpoint: null,
  apiKey: null,
  batchSize: 10,
  flushIntervalMs: 30000,
  retryAttempts: 3,
  retryDelayMs: 1000,
};

let sinkConfig = { ...DEFAULT_CONFIG };
let eventQueue = [];
let flushTimer = null;

export function configureSink(config) {
  sinkConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  if (sinkConfig.enabled && sinkConfig.endpoint) {
    startFlushTimer();
  } else {
    stopFlushTimer();
  }
}

export function getSinkConfig() {
  return { ...sinkConfig };
}

export function isSinkEnabled() {
  return sinkConfig.enabled && !!sinkConfig.endpoint;
}

function startFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    flush();
  }, sinkConfig.flushIntervalMs);
}

function stopFlushTimer() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

export function queueEvent(eventType, eventData) {
  if (!isSinkEnabled()) return;

  const event = {
    type: eventType,
    data: eventData,
    timestamp: Date.now(),
    environment: getEnvironment(),
  };

  eventQueue.push(event);

  if (eventQueue.length >= sinkConfig.batchSize) {
    flush();
  }
}

async function sendBatch(events, attempt = 1) {
  const { endpoint, apiKey, retryAttempts, retryDelayMs } = sinkConfig;

  const headers = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        events,
        meta: {
          environment: getEnvironment(),
          sentAt: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return { success: true, count: events.length };
  } catch (error) {
    if (attempt < retryAttempts) {
      await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempt));
      return sendBatch(events, attempt + 1);
    }

    if (isProduction()) {
      console.warn('[Telemetry] Failed to send batch after retries:', error.message);
    }

    return { success: false, error: error.message };
  }
}

export async function flush() {
  if (!isSinkEnabled() || eventQueue.length === 0) {
    return { success: true, count: 0 };
  }

  const batch = eventQueue.splice(0, sinkConfig.batchSize);
  return sendBatch(batch);
}

export async function sendSnapshot() {
  if (!isSinkEnabled()) {
    return { success: false, error: 'Sink not configured' };
  }

  const payload = buildExportPayload({ includeAllEnvironments: false });
  const { endpoint, apiKey } = sinkConfig;

  const headers = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(`${endpoint}/snapshot`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function getQueueLength() {
  return eventQueue.length;
}

export function clearQueue() {
  const cleared = eventQueue.length;
  eventQueue = [];
  return cleared;
}

export function resetSink() {
  stopFlushTimer();
  eventQueue = [];
  sinkConfig = { ...DEFAULT_CONFIG };
}
