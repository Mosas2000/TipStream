export function getTipRowKey(tip) {
  const tipId = tip?.tipId;
  if (tipId !== undefined && tipId !== null && String(tipId) !== '') {
    return `tip:${String(tipId)}`;
  }

  const txId = tip?.txId;
  if (txId !== undefined && txId !== null && String(txId) !== '') {
    return `tx:${String(txId)}`;
  }

  return 'tip:unknown';
}
