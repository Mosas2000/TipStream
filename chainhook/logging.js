/**
 * Structured logging for the chainhook service.
 * 
 * Provides context-aware logging with severity levels and JSON formatting
 * for better observability and debugging in production.
 */

const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

class Logger {
  constructor(serviceName = 'chainhook') {
    this.serviceName = serviceName;
    this.minLevel = process.env.LOG_LEVEL || 'INFO';
  }

  /**
   * Log a message with context and severity level.
   * Outputs JSON for easy parsing by log aggregation systems.
   * 
   * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
   * @param {string} message - Log message
   * @param {object} context - Additional context data
   */
  log(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      level,
      service: this.serviceName,
      message,
      ...context,
    };

    process.stdout.write(JSON.stringify(entry) + '\n');
  }

  debug(message, context) {
    this.log(LOG_LEVELS.DEBUG, message, context);
  }

  info(message, context) {
    this.log(LOG_LEVELS.INFO, message, context);
  }

  warn(message, context) {
    this.log(LOG_LEVELS.WARN, message, context);
  }

  error(message, error, context = {}) {
    const errorContext = {
      ...context,
      error: {
        name: error?.name || 'Error',
        message: error?.message || String(error),
        stack: error?.stack,
      },
    };
    this.log(LOG_LEVELS.ERROR, message, errorContext);
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

export const logger = new Logger('chainhook');
