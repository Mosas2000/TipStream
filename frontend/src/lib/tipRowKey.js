/**
 * Generate a stable key for a tip row in the feed.
 * 
 * Uses a three-tier fallback strategy to ensure stable keys:
 * 1. tipId (primary) - unique tip identifier
 * 2. txId (secondary) - transaction hash
 * 3. fingerprint (tertiary) - combination of tip properties
 * 
 * @param {Object} tip - The tip object
 * @param {string|number} [tip.tipId] - Unique tip identifier
 * @param {string} [tip.txId] - Transaction hash
 * @param {string} [tip.sender] - Sender address
 * @param {string} [tip.recipient] - Recipient address
 * @param {string|number} [tip.amount] - Tip amount
 * @param {string|number} [tip.fee] - Transaction fee
 * @param {number} [tip.timestamp] - Timestamp
 * @returns {string} Stable key for React rendering
 */
export function getTipRowKey(tip) {
  // Try primary key: tipId
  const rawTipId = tip?.tipId;
  if (rawTipId !== undefined && rawTipId !== null) {
    const tipId = String(rawTipId).trim();
    if (tipId) return `tip:${tipId}`;
  }

  // Try secondary key: txId
  const rawTxId = tip?.txId;
  if (rawTxId !== undefined && rawTxId !== null) {
    const txId = String(rawTxId).trim();
    if (txId) return `tx:${txId}`;
  }

  // Fallback to fingerprint using tip properties
  const sender = tip?.sender ?? 'unknown';
  const recipient = tip?.recipient ?? 'unknown';
  const amount = tip?.amount ?? '0';
  const fee = tip?.fee ?? '0';
  const timestamp = tip?.timestamp ?? '0';

  return `fp:${sender}:${recipient}:${amount}:${fee}:${timestamp}`;
}
