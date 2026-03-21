export const RECIPIENT_ERRORS = {
  BLOCKED: {
    code: 'RECIPIENT_BLOCKED',
    message: 'This recipient has blocked you. Transactions to blocked recipients will fail on-chain.',
    severity: 'error',
  },
  CONTRACT_PRINCIPAL: {
    code: 'CONTRACT_PRINCIPAL',
    message: 'Contract principals cannot receive tips. Funds sent to contracts may be permanently unrecoverable.',
    severity: 'error',
  },
  SELF_TIP: {
    code: 'SELF_TIP',
    message: 'You cannot send a tip to yourself.',
    severity: 'warning',
  },
  INVALID_FORMAT: {
    code: 'INVALID_FORMAT',
    message: 'Enter a valid Stacks principal (SP... or SP....contract-name)',
    severity: 'warning',
  },
};

export function getRecipientErrorCode(recipient, isBlocked, isContract) {
  if (isBlocked) return RECIPIENT_ERRORS.BLOCKED.code;
  if (isContract) return RECIPIENT_ERRORS.CONTRACT_PRINCIPAL.code;
  return null;
}

export function getRecipientErrorMessage(errorCode) {
  if (!errorCode) return null;
  const error = Object.values(RECIPIENT_ERRORS).find(e => e.code === errorCode);
  return error ? error.message : null;
}

export function getRecipientErrorSeverity(errorCode) {
  if (!errorCode) return null;
  const error = Object.values(RECIPIENT_ERRORS).find(e => e.code === errorCode);
  return error ? error.severity : 'warning';
}

export function formatRecipientError(recipient, errorCode) {
  const message = getRecipientErrorMessage(errorCode);
  const severity = getRecipientErrorSeverity(errorCode);
  
  if (!message) return null;
  
  return {
    recipient: recipient?.trim() || '',
    errorCode,
    message,
    severity,
    timestamp: new Date().toISOString(),
  };
}

export function isBlockingError(errorCode) {
  const blockingErrors = [
    RECIPIENT_ERRORS.BLOCKED.code,
    RECIPIENT_ERRORS.CONTRACT_PRINCIPAL.code,
  ];
  
  return blockingErrors.includes(errorCode);
}

export function isWarningError(errorCode) {
  const warningErrors = [
    RECIPIENT_ERRORS.INVALID_FORMAT.code,
    RECIPIENT_ERRORS.SELF_TIP.code,
  ];
  
  return warningErrors.includes(errorCode);
}
