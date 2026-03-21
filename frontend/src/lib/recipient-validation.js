import { isContractPrincipal } from './stacks-principal';

const BLOCKED_RECIPIENT_ERROR = 'This recipient has blocked you. Transactions to blocked recipients will fail on-chain.';
const CONTRACT_PRINCIPAL_ERROR = 'Contract principals cannot receive tips. Funds sent to contracts may be permanently unrecoverable.';

export function validateRecipientRiskLevel(recipient, isBlocked) {
  if (!recipient) {
    return { isBlocked: false, isContract: false, canProceed: true, error: null };
  }

  const trimmed = recipient.trim();
  const isContractAddress = isContractPrincipal(trimmed);
  const blockedByRecipient = isBlocked === true;

  return {
    isBlocked: blockedByRecipient,
    isContract: isContractAddress,
    canProceed: !blockedByRecipient && !isContractAddress,
    error: blockedByRecipient
      ? BLOCKED_RECIPIENT_ERROR
      : isContractAddress
        ? CONTRACT_PRINCIPAL_ERROR
        : null,
  };
}

export function getRecipientValidationMessage(recipient, isBlocked) {
  const validation = validateRecipientRiskLevel(recipient, isBlocked);
  return validation.error;
}

export function canProceedWithRecipient(recipient, isBlocked) {
  const validation = validateRecipientRiskLevel(recipient, isBlocked);
  return validation.canProceed;
}

export function isHighRiskRecipient(recipient, isBlocked) {
  const validation = validateRecipientRiskLevel(recipient, isBlocked);
  return validation.isBlocked || validation.isContract;
}
