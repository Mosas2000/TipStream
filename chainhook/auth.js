/**
 * Authentication utilities for the chainhook service.
 * 
 * Implements secure bearer token validation with timing attack resistance
 * and proper error handling for production deployments.
 */

/**
 * Constant-time string comparison to prevent timing attacks.
 * Compares two strings in constant time regardless of where they differ.
 * 
 * @param {string} a - First string to compare
 * @param {string} b - Second string to compare
 * @returns {boolean} True if strings are equal, false otherwise
 */
export function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Validate a bearer token from the Authorization header.
 * Performs constant-time comparison to prevent timing attacks.
 * 
 * @param {string} authHeader - Raw Authorization header value
 * @param {string} expectedToken - Expected bearer token (without "Bearer " prefix)
 * @returns {boolean} True if token is valid, false otherwise
 */
export function validateBearerToken(authHeader, expectedToken) {
  if (!authHeader || typeof authHeader !== 'string') {
    return false;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return false;
  }

  return constantTimeEqual(parts[1], expectedToken);
}
