export const RECIPIENT_BLOCK_EVENTS = {
  BLOCKED_RECIPIENT_DETECTED: 'blocked_recipient_detected',
  CONTRACT_PRINCIPAL_DETECTED: 'contract_principal_detected',
  BLOCKED_SUBMISSION_ATTEMPTED: 'blocked_submission_attempted',
  BLOCK_CHECK_COMPLETED: 'block_check_completed',
  BLOCK_CHECK_FAILED: 'block_check_failed',
  RECIPIENT_CHANGED: 'recipient_changed',
};

export function trackBlockedRecipientDetected(recipient) {
  return {
    event: RECIPIENT_BLOCK_EVENTS.BLOCKED_RECIPIENT_DETECTED,
    recipient: recipient?.slice(0, 8) + '...' + recipient?.slice(-4),
    timestamp: new Date().toISOString(),
  };
}

export function trackContractPrincipalDetected(recipient) {
  return {
    event: RECIPIENT_BLOCK_EVENTS.CONTRACT_PRINCIPAL_DETECTED,
    recipient: recipient?.slice(0, 8) + '...' + recipient?.slice(-4),
    timestamp: new Date().toISOString(),
  };
}

export function trackBlockedSubmissionAttempted(recipient, reason) {
  return {
    event: RECIPIENT_BLOCK_EVENTS.BLOCKED_SUBMISSION_ATTEMPTED,
    recipient: recipient?.slice(0, 8) + '...' + recipient?.slice(-4),
    reason,
    timestamp: new Date().toISOString(),
  };
}

export function trackBlockCheckCompleted(recipient, isBlocked) {
  return {
    event: RECIPIENT_BLOCK_EVENTS.BLOCK_CHECK_COMPLETED,
    recipient: recipient?.slice(0, 8) + '...' + recipient?.slice(-4),
    isBlocked,
    timestamp: new Date().toISOString(),
  };
}

export function trackBlockCheckFailed(recipient, error) {
  return {
    event: RECIPIENT_BLOCK_EVENTS.BLOCK_CHECK_FAILED,
    recipient: recipient?.slice(0, 8) + '...' + recipient?.slice(-4),
    error: error?.message || String(error),
    timestamp: new Date().toISOString(),
  };
}

export function trackRecipientChanged(recipient) {
  return {
    event: RECIPIENT_BLOCK_EVENTS.RECIPIENT_CHANGED,
    recipient: recipient ? recipient.slice(0, 8) + '...' + recipient.slice(-4) : 'cleared',
    timestamp: new Date().toISOString(),
  };
}
