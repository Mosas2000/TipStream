export function getTipRowKey(tip) {
  const tipId = tip?.tipId;
  if (tipId !== undefined && tipId !== null && String(tipId) !== '') {
    return `tip:${String(tipId)}`;
  }

  return 'tip:unknown';
}
