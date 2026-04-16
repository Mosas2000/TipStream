function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function decodeNumericValue(value) {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }

  return value;
}

function decodeClarityWrapper(node) {
  if (!isPlainObject(node) || !('type' in node)) {
    return null;
  }

  const { type, value } = node;

  switch (type) {
    case 'bool':
      return Boolean(value);
    case 'uint':
    case 'int':
      return decodeNumericValue(value);
    case 'principal':
      if (typeof value === 'string') {
        return value;
      }
      if (isPlainObject(value)) {
        return value.repr || value.address || value.id || value.value || null;
      }
      return decodeNumericValue(value);
    case 'string-ascii':
    case 'string-utf8':
    case 'buffer':
      return value == null ? '' : String(value);
    case 'none':
      return null;
    case 'optional':
    case 'some':
    case 'response':
    case 'ok':
    case 'err':
      return normalizeClarityValue(value);
    case 'tuple':
      if (!isPlainObject(value)) {
        return null;
      }
      return normalizeClarityValue(value);
    case 'list':
      if (!Array.isArray(value)) {
        return [];
      }
      return value.map((item) => normalizeClarityValue(item));
    default:
      return null;
  }
}

export function normalizeClarityValue(value) {
  if (value == null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeClarityValue(item));
  }

  if (typeof value === 'bigint' || typeof value === 'number') {
    return decodeNumericValue(value);
  }

  if (typeof value !== 'object') {
    return value;
  }

  const wrapped = decodeClarityWrapper(value);
  if (wrapped !== null) {
    return wrapped;
  }

  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = normalizeClarityValue(entry);
  }
  return result;
}

export function normalizeClarityEventFields(value) {
  const decoded = normalizeClarityValue(value);
  if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
    return null;
  }

  return decoded;
}
