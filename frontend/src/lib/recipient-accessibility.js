export const ARIA_LABELS = {
  RECIPIENT_INPUT: 'Recipient address input',
  RECIPIENT_ERROR: 'Recipient validation error message',
  BLOCK_STATUS: 'Recipient block status',
  SEND_BUTTON: 'Send tip button',
  CONTRACT_WARNING: 'Contract principal warning',
};

export const ARIA_DESCRIPTIONS = {
  BLOCKED_RECIPIENT: 'This recipient has blocked you and cannot receive tips',
  CONTRACT_PRINCIPAL: 'Contract addresses cannot receive tips',
  BLOCKED_SENDER: 'The recipient has blocked the sender',
};

export const ARIA_LIVE_REGIONS = {
  VALIDATION_STATUS: 'polite',
  ERROR_NOTIFICATION: 'assertive',
  BLOCK_CHECK_STATUS: 'polite',
};

export function createRecipientErrorAriaLabel(errorType) {
  const labels = {
    BLOCKED: 'Error: This recipient has blocked you',
    CONTRACT: 'Error: Contract principals cannot receive tips',
    INVALID: 'Error: Invalid Stacks principal format',
    SELF_TIP: 'Error: Cannot send tip to yourself',
  };

  return labels[errorType] || 'Validation error';
}

export function createRecipientStatusAriaLabel(isBlocked, isContract) {
  if (isBlocked) {
    return 'Recipient has blocked sender';
  }
  if (isContract) {
    return 'Recipient is a contract principal';
  }
  return 'Recipient status: valid';
}

export function getAccessibilityAttributes(isHighRisk, validationMessage) {
  return {
    'aria-invalid': isHighRisk ? 'true' : 'false',
    'aria-describedby': validationMessage ? 'recipient-error-message' : undefined,
    'aria-live': isHighRisk ? 'assertive' : undefined,
  };
}

export function getSendButtonAccessibilityAttributes(isDisabled, reason) {
  return {
    'aria-disabled': isDisabled ? 'true' : 'false',
    'aria-label': reason ? `Send tip button (${reason})` : 'Send tip button',
    'title': reason || 'Send tip',
  };
}
