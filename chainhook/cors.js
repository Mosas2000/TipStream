/**
 * CORS configuration for production safety.
 * 
 * Implements configurable origin allowlisting instead of wildcard to prevent
 * unauthorized cross-origin requests from untrusted domains.
 */

/**
 * Parse comma-separated list of allowed origins from environment.
 * Falls back to safe default if not configured.
 * 
 * @param {string} envValue - CORS_ALLOWED_ORIGINS environment value
 * @returns {Array<string>} List of allowed origins
 */
export function parseAllowedOrigins(envValue) {
  if (!envValue) {
    return ['http://localhost:3000', 'http://localhost:3001'];
  }

  return envValue
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);
}

/**
 * Check if an origin is in the allowlist.
 * 
 * @param {string} origin - Origin from request headers
 * @param {Array<string>} allowedOrigins - List of allowed origins
 * @returns {boolean} True if origin is allowed
 */
export function isOriginAllowed(origin, allowedOrigins) {
  if (!origin || typeof origin !== 'string') {
    return false;
  }

  return allowedOrigins.some(allowed => {
    if (allowed === '*') return true;
    return origin === allowed;
  });
}

/**
 * Get appropriate CORS headers for a request.
 * Returns restrictive headers when origin is not allowed.
 * 
 * @param {string} origin - Origin from request headers
 * @param {Array<string>} allowedOrigins - List of allowed origins
 * @returns {object} Headers object with CORS configuration
 */
export function getCorsHeaders(origin, allowedOrigins) {
  const isAllowed = isOriginAllowed(origin, allowedOrigins);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '3600',
    'Access-Control-Allow-Credentials': isAllowed ? 'true' : 'false',
  };
}
