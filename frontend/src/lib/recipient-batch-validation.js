import { isValidStacksPrincipal, isContractPrincipal } from './stacks-principal';
import { canProceedWithRecipient, isHighRiskRecipient } from './recipient-validation';

export async function validateRecipientBatch(recipients, checkBlockStatus = null) {
  return Promise.all(
    recipients.map(async (recipient) => {
      const trimmed = recipient?.trim() || '';
      const isValid = isValidStacksPrincipal(trimmed);
      const isContract = isContractPrincipal(trimmed);
      
      let isBlocked = null;
      if (checkBlockStatus && isValid && !isContract) {
        isBlocked = await checkBlockStatus(trimmed);
      }

      return {
        recipient: trimmed,
        isValid,
        isContract,
        isBlocked,
        canProceed: isValid && canProceedWithRecipient(trimmed, isBlocked),
        isHighRisk: isValid && isHighRiskRecipient(trimmed, isBlocked),
        errors: generateValidationErrors(trimmed, isValid, isContract, isBlocked),
      };
    })
  );
}

function generateValidationErrors(recipient, isValid, isContract, isBlocked) {
  const errors = [];

  if (!recipient) {
    errors.push({
      code: 'EMPTY_RECIPIENT',
      message: 'Recipient address is required',
      severity: 'error',
    });
    return errors;
  }

  if (!isValid) {
    errors.push({
      code: 'INVALID_FORMAT',
      message: 'Invalid Stacks principal format',
      severity: 'error',
    });
    return errors;
  }

  if (isContract) {
    errors.push({
      code: 'CONTRACT_PRINCIPAL',
      message: 'Contract principals cannot receive tips',
      severity: 'error',
    });
  }

  if (isBlocked === true) {
    errors.push({
      code: 'RECIPIENT_BLOCKED',
      message: 'This recipient has blocked you',
      severity: 'error',
    });
  }

  return errors;
}

export function filterValidRecipients(validationResults) {
  return validationResults.filter((result) => result.canProceed);
}

export function filterHighRiskRecipients(validationResults) {
  return validationResults.filter((result) => result.isHighRisk);
}

export function getRecipientValidationStats(validationResults) {
  return {
    total: validationResults.length,
    valid: validationResults.filter((r) => r.isValid).length,
    invalid: validationResults.filter((r) => !r.isValid).length,
    contracts: validationResults.filter((r) => r.isContract).length,
    blocked: validationResults.filter((r) => r.isBlocked === true).length,
    canProceed: validationResults.filter((r) => r.canProceed).length,
    highRisk: validationResults.filter((r) => r.isHighRisk).length,
  };
}

export function groupRecipientsByRiskLevel(validationResults) {
  return {
    safe: validationResults.filter((r) => r.canProceed && !r.isHighRisk),
    blocked: validationResults.filter((r) => r.isBlocked === true),
    contracts: validationResults.filter((r) => r.isContract),
    invalid: validationResults.filter((r) => !r.isValid),
  };
}
