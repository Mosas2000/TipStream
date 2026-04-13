const DEFAULT_ERROR_CODE = 'internal_error';

export class ChainhookError extends Error {
  constructor(message, { code = DEFAULT_ERROR_CODE, statusCode = 500, category = 'internal', details = {} } = {}) {
    super(message);
    this.name = 'ChainhookError';
    this.code = code;
    this.statusCode = statusCode;
    this.category = category;
    this.details = details;
  }
}

export class BadRequestError extends ChainhookError {
  constructor(message, details = {}) {
    super(message, { code: 'bad_request', statusCode: 400, category: 'request', details });
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends ChainhookError {
  constructor(message = 'unauthorized', details = {}) {
    super(message, { code: 'unauthorized', statusCode: 401, category: 'auth', details });
    this.name = 'UnauthorizedError';
  }
}

export class RateLimitError extends ChainhookError {
  constructor(message = 'rate limit exceeded', details = {}) {
    super(message, { code: 'rate_limited', statusCode: 429, category: 'throttle', details });
    this.name = 'RateLimitError';
  }
}

export class PayloadTooLargeError extends ChainhookError {
  constructor(message = 'payload too large', details = {}) {
    super(message, { code: 'payload_too_large', statusCode: 413, category: 'request', details });
    this.name = 'PayloadTooLargeError';
  }
}

export class StorageUnavailableError extends ChainhookError {
  constructor(message = 'storage unavailable', details = {}) {
    super(message, { code: 'storage_unavailable', statusCode: 503, category: 'storage', details });
    this.name = 'StorageUnavailableError';
  }
}

export function isChainhookError(error) {
  return error instanceof ChainhookError;
}

export function classifyError(error) {
  if (isChainhookError(error)) {
    return error;
  }

  if (error instanceof SyntaxError) {
    return new BadRequestError('invalid payload', { reason: error.message });
  }

  const lowerMessage = String(error?.message || error || '').toLowerCase();
  if (lowerMessage.includes('request body too large')) {
    return new PayloadTooLargeError('payload too large', { reason: error?.message || String(error) });
  }

  const code = error?.code;
  const message = lowerMessage;
  if (
    ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENOTFOUND', '57P03', '53300'].includes(code) ||
    message.includes('postgres') ||
    message.includes('database') ||
    message.includes('connection refused') ||
    message.includes('cannot connect')
  ) {
    return new StorageUnavailableError(error?.message || 'storage unavailable', {
      reason: error?.message || String(error),
      code,
    });
  }

  return new ChainhookError(error?.message || 'internal error', {
    code: DEFAULT_ERROR_CODE,
    statusCode: 500,
    category: 'internal',
    details: { reason: error?.message || String(error) },
  });
}

export function toErrorResponse(error, requestId) {
  const classified = classifyError(error);
  return {
    statusCode: classified.statusCode,
    body: {
      error: classified.code,
      message: classified.message,
      request_id: requestId || null,
    },
    classified,
  };
}
