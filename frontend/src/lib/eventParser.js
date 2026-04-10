import { getEventSchema, isValidEventType } from './eventSchemas';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractClarityValue(repr, fieldName) {
  const escaped = escapeRegex(fieldName);
  const patterns = [
    { regex: new RegExp(`${escaped}\\s+'([A-Z0-9]+)`, 'i'), type: 'principal' },
    { regex: new RegExp(`${escaped}\\s+u(\\d+)`, 'i'), type: 'uint' },
    { regex: new RegExp(`${escaped}\\s+u"([^"]*)"`, 'i'), type: 'string' },
    { regex: new RegExp(`${escaped}\\s+true`, 'i'), type: 'bool-true' },
    { regex: new RegExp(`${escaped}\\s+false`, 'i'), type: 'bool-false' },
  ];

  for (const { regex, type } of patterns) {
    const match = repr.match(regex);
    if (match) {
      if (type === 'bool-true') return true;
      if (type === 'bool-false') return false;
      return match[1];
    }
  }

  return null;
}

function parseReprObject(repr) {
  const eventMatch = repr.match(/event\s+u?"([^"]+)"/);
  if (!eventMatch) return null;

  const eventType = eventMatch[1];

  if (!isValidEventType(eventType)) {
    return null;
  }

  const schema = getEventSchema(eventType);
  const result = { event: eventType };

  for (const fieldName of schema.required) {
    const value = extractClarityValue(repr, fieldName);
    if (value === null) {
      return null;
    }
    result[fieldName] = value;
  }

  for (const fieldName of schema.optional) {
    const value = extractClarityValue(repr, fieldName);
    if (value !== null) {
      result[fieldName] = value;
    }
  }

  if (schema.defaults) {
    for (const [fieldName, defaultValue] of Object.entries(schema.defaults)) {
      if (!(fieldName in result)) {
        result[fieldName] = defaultValue;
      }
    }
  }

  return result;
}

function parseReprObjectLenient(repr) {
  const eventMatch = repr.match(/event\s+u?"([^"]+)"/);
  if (!eventMatch) return null;

  const eventType = eventMatch[1];
  const result = { event: eventType };

  if (isValidEventType(eventType)) {
    const schema = getEventSchema(eventType);

    for (const fieldName of schema.required) {
      const value = extractClarityValue(repr, fieldName);
      if (value !== null) {
        result[fieldName] = value;
      }
    }

    for (const fieldName of schema.optional) {
      const value = extractClarityValue(repr, fieldName);
      if (value !== null) {
        result[fieldName] = value;
      }
    }

    if (schema.defaults) {
      for (const [fieldName, defaultValue] of Object.entries(schema.defaults)) {
        if (!(fieldName in result)) {
          result[fieldName] = defaultValue;
        }
      }
    }
  }

  return result;
}

export function parseContractEvent(repr) {
  if (!repr || typeof repr !== 'string') {
    return null;
  }

  try {
    return parseReprObject(repr);
  } catch {
    return null;
  }
}

export function parseContractEventLenient(repr) {
  if (!repr || typeof repr !== 'string') {
    return null;
  }

  try {
    return parseReprObjectLenient(repr);
  } catch {
    return null;
  }
}
