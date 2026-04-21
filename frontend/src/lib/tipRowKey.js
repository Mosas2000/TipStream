export function getTipRowKey(tip) {
  const rawTipId = tip?.tipId;
  if (rawTipId !== undefined && rawTipId !== null) {
    const tipId = String(rawTipId).trim();
    if (tipId) return `tip:${tipId}`;
  }

  const rawTxId = tip?.txId;
  if (rawTxId !== undefined && rawTxId !== null) {
    const txId = String(rawTxId).trim();
    if (txId) return `tx:${txId}`;
  }

  const sender = tip?.sender ?? 'unknown';
  const recipient = tip?.recipient ?? 'unknown';
  const amount = tip?.amount ?? '0';
  const fee = tip?.fee ?? '0';
  const timestamp = tip?.timestamp ?? '0';

  return `fp:${sender}:${recipient}:${amount}:${fee}:${timestamp}`;
}
