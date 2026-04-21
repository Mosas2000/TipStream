export function getTipRowKey(tip) {
  const tipId = tip?.tipId;
  if (tipId !== undefined && tipId !== null && String(tipId) !== '') {
    return `tip:${String(tipId)}`;
  }

  const txId = tip?.txId;
  if (txId !== undefined && txId !== null && String(txId) !== '') {
    return `tx:${String(txId)}`;
  }

  const sender = tip?.sender ?? 'unknown';
  const recipient = tip?.recipient ?? 'unknown';
  const amount = tip?.amount ?? '0';
  const fee = tip?.fee ?? '0';
  const timestamp = tip?.timestamp ?? '0';

  return `fp:${sender}:${recipient}:${amount}:${fee}:${timestamp}`;
}
