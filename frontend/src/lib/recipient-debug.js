const DEBUG_KEY = 'DEBUG_RECIPIENT_VALIDATION';

function isDebugEnabled() {
  if (typeof window === 'undefined') return false;
  return window.localStorage?.getItem(DEBUG_KEY) === 'true';
}

export function debugLog(message, data = {}) {
  if (!isDebugEnabled()) return;
  
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [Recipient Validation] ${message}`;
  
  if (Object.keys(data).length > 0) {
    console.log(formattedMessage, data);
  } else {
    console.log(formattedMessage);
  }
}

export function debugError(message, error = null) {
  if (!isDebugEnabled()) return;
  
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [Recipient Validation] ERROR: ${message}`;
  
  if (error) {
    console.error(formattedMessage, error);
  } else {
    console.error(formattedMessage);
  }
}

export function debugBlockCheckInitiated(recipient) {
  debugLog('Block check initiated', { recipient: truncateAddress(recipient) });
}

export function debugBlockCheckCompleted(recipient, isBlocked, duration) {
  debugLog('Block check completed', {
    recipient: truncateAddress(recipient),
    isBlocked,
    durationMs: duration,
  });
}

export function debugBlockCheckFailed(recipient, error) {
  debugError('Block check failed', {
    recipient: truncateAddress(recipient),
    error: error?.message || String(error),
  });
}

export function debugValidationStateChanged(state) {
  debugLog('Validation state changed', {
    recipient: truncateAddress(state.recipient),
    isValid: state.isValid,
    isHighRisk: state.isHighRisk,
    isBlocked: state.isBlocked,
    isContract: state.isContract,
  });
}

export function debugSubmissionAttempt(recipient, allowed, reason) {
  const status = allowed ? 'ALLOWED' : 'BLOCKED';
  debugLog(`Submission ${status}`, {
    recipient: truncateAddress(recipient),
    reason: reason || 'No reason provided',
  });
}

export function truncateAddress(address) {
  if (!address) return '';
  return address.slice(0, 8) + '...' + address.slice(-4);
}

export function enableDebugMode() {
  if (typeof window !== 'undefined') {
    window.localStorage?.setItem(DEBUG_KEY, 'true');
    console.log('Recipient validation debug mode enabled');
  }
}

export function disableDebugMode() {
  if (typeof window !== 'undefined') {
    window.localStorage?.removeItem(DEBUG_KEY);
    console.log('Recipient validation debug mode disabled');
  }
}

export function getDebugStats() {
  return {
    debugEnabled: isDebugEnabled(),
    debugKey: DEBUG_KEY,
    browserEnv: typeof window !== 'undefined',
  };
}
