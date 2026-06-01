/**
 * Utilities for summarizing and building notification messages for batch tip transactions.
 */

/**
 * Summarizes the outcome of a batch tip transaction by parsing its event log.
 *
 * @param {object} txData - Transaction receipt from Stacks API.
 * @param {number} totalRecipients - Expected number of recipients in the batch.
 * @returns {{ successCount: number, failureCount: number, totalCount: number }}
 */
export function summarizeBatchTipResult(txData, totalRecipients) {
  if (!txData) {
    return {
      successCount: 0,
      failureCount: totalRecipients,
      totalCount: totalRecipients,
    };
  }

  if (txData.tx_status !== 'success') {
    return {
      successCount: 0,
      failureCount: totalRecipients,
      totalCount: totalRecipients,
    };
  }

  // If there's no events array, or it's empty, assume all succeeded
  if (!Array.isArray(txData.events) || txData.events.length === 0) {
    return {
      successCount: totalRecipients,
      failureCount: 0,
      totalCount: totalRecipients,
    };
  }

  // Stacks contract emits "smart_contract_log" events for each successful transfer/tip.
  // Let's count how many print events are present in the transaction events list.
  const printEvents = txData.events.filter(e => e.event_type === 'smart_contract_log');

  // Resilient check: if we have print events, use that count. Otherwise, assume full success.
  const successCount = printEvents.length > 0 ? Math.min(printEvents.length, totalRecipients) : totalRecipients;
  const failureCount = Math.max(0, totalRecipients - successCount);

  return {
    successCount,
    failureCount,
    totalCount: totalRecipients,
  };
}

/**
 * Builds a user-friendly outcome message for a batch tip transaction.
 *
 * @param {{ successCount: number, failureCount: number, totalCount: number }} summary
 * @returns {string} User-facing result message.
 */
export function buildBatchTipOutcomeMessage(summary) {
  const { successCount, failureCount, totalCount } = summary;

  if (failureCount === 0) {
    return `Successfully sent all ${totalCount} tip${totalCount !== 1 ? 's' : ''}!`;
  }

  if (successCount === 0) {
    return `Failed to send any of the ${totalCount} tip${totalCount !== 1 ? 's' : ''}.`;
  }

  return `Batch complete: ${successCount} tip${successCount !== 1 ? 's' : ''} succeeded, ${failureCount} failed.`;
}
