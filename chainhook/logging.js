/**
 * Structured logging for the chainhook service.
 *
 * Provides context-aware logging with severity levels and JSON formatting
 * for better observability and debugging in production.
 */

const LOG_LEVELS = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
};

function normalizeLevel(level) {
  if (!level || typeof level !== 'string') {
    return 'INFO';
  }

  const upper = level.toUpperCase();
  return LOG_LEVELS[upper] ? upper : 'INFO';
}

function levelValue(level) {
  return LOG_LEVELS[normalizeLevel(level)] || LOG_LEVELS.INFO;
}

function sanitizeContext(context = {}) {
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined),
  );
}

class Logger {
  constructor(serviceName = 'chainhook') {
    this.serviceName = serviceName;
    this.minLevel = normalizeLevel(process.env.LOG_LEVEL || 'INFO');
  }

  shouldLog(level) {
    return levelValue(level) >= levelValue(this.minLevel);
  }

  setLevel(level) {
    this.minLevel = normalizeLevel(level);
  }

  log(level, message, context = {}) {
    const normalizedLevel = normalizeLevel(level);
    if (!this.shouldLog(normalizedLevel)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      level: normalizedLevel,
      service: this.serviceName,
      message,
      ...sanitizeContext(context),
    };

    process.stdout.write(JSON.stringify(entry) + '\n');
  }

  debug(message, context) {
    this.log('DEBUG', message, context);
  }

  info(message, context) {
    this.log('INFO', message, context);
  }

  warn(message, context) {
    this.log('WARN', message, context);
  }

  error(message, error, context = {}) {
    const errorContext = {
      ...sanitizeContext(context),
      error: {
        name: error?.name || 'Error',
        message: error?.message || String(error),
        stack: error?.stack,
      },
    };
    this.log('ERROR', message, errorContext);
  }

  /**
   * Log incoming HTTP request with method, path, and IP.
   */
  logRequest(req, context = {}) {
    this.info('Incoming request', {
      method: req.method,
      path: req.url,
      ip: req.socket?.remoteAddress,
      ...context,
    });
  }

  /**
   * Log response with status code and processing time.
   */
  logResponse(req, statusCode, processingMs, context = {}) {
    this.info('Response sent', {
      method: req.method,
      path: req.url,
      status: statusCode,
      processing_ms: processingMs,
      ...context,
    });
  }
}

export { Logger, LOG_LEVELS, normalizeLevel, sanitizeContext };
export const logger = new Logger('chainhook');
