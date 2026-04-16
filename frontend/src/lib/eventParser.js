import { getEventSchema, isValidEventType } from './eventSchemas';
import { normalizeClarityEventFields } from '../../../shared/clarityValues.js';

function tokenizeClarityRepr(repr) {
  const tokens = [];
  let index = 0;

  while (index < repr.length) {
    const char = repr[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (char === '(') {
      tokens.push({ type: 'lparen' });
      index += 1;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: 'rparen' });
      index += 1;
      continue;
    }

    if (char === '"') {
      let value = '';
      index += 1;
      let closed = false;

      while (index < repr.length) {
        const current = repr[index];

        if (current === '\\') {
          const next = repr[index + 1];
          if (next === undefined) {
            return null;
          }

          if (next === 'n') {
            value += '\n';
          } else if (next === 'r') {
            value += '\r';
          } else if (next === 't') {
            value += '\t';
          } else {
            value += next;
          }

          index += 2;
          continue;
        }

        if (current === '"') {
          closed = true;
          index += 1;
          break;
        }

        value += current;
        index += 1;
      }

      if (!closed) {
        return null;
      }

      tokens.push({ type: 'string', value });
      continue;
    }

    if (char === 'u' && repr[index + 1] === '"') {
      let value = '';
      index += 2;
      let closed = false;

      while (index < repr.length) {
        const current = repr[index];

        if (current === '\\') {
          const next = repr[index + 1];
          if (next === undefined) {
            return null;
          }

          if (next === 'n') {
            value += '\n';
          } else if (next === 'r') {
            value += '\r';
          } else if (next === 't') {
            value += '\t';
          } else {
            value += next;
          }

          index += 2;
          continue;
        }

        if (current === '"') {
          closed = true;
          index += 1;
          break;
        }

        value += current;
        index += 1;
      }

      if (!closed) {
        return null;
      }

      tokens.push({ type: 'string', value });
      continue;
    }

    let end = index;
    while (end < repr.length && !/\s/.test(repr[end]) && repr[end] !== '(' && repr[end] !== ')') {
      end += 1;
    }

    tokens.push({ type: 'atom', value: repr.slice(index, end) });
    index = end;
  }

  return tokens;
}

function parseNode(tokens, startIndex = 0) {
  const token = tokens[startIndex];
  if (!token) {
    return null;
  }

  if (token.type === 'string') {
    return [{ kind: 'string', value: token.value }, startIndex + 1];
  }

  if (token.type === 'atom') {
    if (token.value === 'true' || token.value === 'false') {
      return [{ kind: 'bool', value: token.value === 'true' }, startIndex + 1];
    }

    if (token.value === 'none') {
      return [{ kind: 'none' }, startIndex + 1];
    }

    if (/^u\d+$/.test(token.value)) {
      return [{ kind: 'uint', value: token.value.slice(1) }, startIndex + 1];
    }

    if (token.value.startsWith("'")) {
      return [{ kind: 'principal', value: token.value.slice(1) }, startIndex + 1];
    }

    return [{ kind: 'atom', value: token.value }, startIndex + 1];
  }

  if (token.type !== 'lparen') {
    return null;
  }

  const operator = tokens[startIndex + 1];
  if (!operator || operator.type !== 'atom') {
    return null;
  }

  if (operator.value === 'tuple') {
    const entries = {};
    let index = startIndex + 2;

    while (index < tokens.length && tokens[index].type !== 'rparen') {
      const entryStart = tokens[index];
      if (!entryStart || entryStart.type !== 'lparen') {
        return null;
      }

      const keyToken = tokens[index + 1];
      if (!keyToken || keyToken.type !== 'atom') {
        return null;
      }

      const parsedValue = parseNode(tokens, index + 2);
      if (!parsedValue) {
        return null;
      }

      const [valueNode, nextIndex] = parsedValue;
      const closingToken = tokens[nextIndex];
      if (!closingToken || closingToken.type !== 'rparen') {
        return null;
      }

      entries[keyToken.value] = valueNode;
      index = nextIndex + 1;
    }

    if (tokens[index]?.type !== 'rparen') {
      return null;
    }

    return [{ kind: 'tuple', entries }, index + 1];
  }

  if (operator.value === 'list') {
    const items = [];
    let index = startIndex + 2;

    while (index < tokens.length && tokens[index].type !== 'rparen') {
      const parsedItem = parseNode(tokens, index);
      if (!parsedItem) {
        return null;
      }

      const [itemNode, nextIndex] = parsedItem;
      items.push(itemNode);
      index = nextIndex;
    }

    if (tokens[index]?.type !== 'rparen') {
      return null;
    }

    return [{ kind: 'list', items }, index + 1];
  }

  if (operator.value === 'some' || operator.value === 'ok' || operator.value === 'err') {
    const parsedValue = parseNode(tokens, startIndex + 2);
    if (!parsedValue) {
      return null;
    }

    const [valueNode, nextIndex] = parsedValue;
    if (tokens[nextIndex]?.type !== 'rparen') {
      return null;
    }

    return [
      {
        kind: operator.value === 'some' ? 'optional' : 'response',
        type: operator.value,
        value: valueNode,
      },
      nextIndex + 1,
    ];
  }

  return null;
}

function parseClarityRepr(repr) {
  const tokens = tokenizeClarityRepr(repr);
  if (!tokens || tokens.length === 0) {
    return null;
  }

  const parsed = parseNode(tokens, 0);
  if (!parsed) {
    return null;
  }

  const [node, nextIndex] = parsed;
  if (nextIndex !== tokens.length) {
    return null;
  }

  return node;
}

function nodeToValue(node) {
  if (!node) {
    return null;
  }

  switch (node.kind) {
    case 'string':
    case 'uint':
    case 'principal':
    case 'atom':
      return node.value;
    case 'bool':
      return node.value;
    case 'none':
      return null;
    case 'optional':
    case 'response':
      return nodeToValue(node.value);
    case 'list':
      return node.items.map((item) => nodeToValue(item));
    case 'tuple':
      return Object.fromEntries(
        Object.entries(node.entries).map(([key, value]) => [key, nodeToValue(value)]),
      );
    default:
      return null;
  }
}

function parseTupleFields(repr) {
  const root = parseClarityRepr(repr);
  if (!root || root.kind !== 'tuple') {
    return null;
  }

  const fields = {};
  for (const [key, value] of Object.entries(root.entries)) {
    fields[key] = nodeToValue(value);
  }

  return fields;
}

function parseStructuredFields(value) {
  const fields = normalizeClarityEventFields(value);
  if (!fields) {
    return null;
  }

  return fields;
}

function extractEventType(fields) {
  const eventField = fields.event;
  if (typeof eventField === 'string') {
    return eventField;
  }

  return null;
}

function hydrateSchemaFields(fields, schema, result, strict = true) {
  for (const fieldName of schema.required) {
    if (!(fieldName in fields)) {
      if (strict) {
        return false;
      }
      continue;
    }

    result[fieldName] = fields[fieldName];
  }

  for (const fieldName of schema.optional) {
    if (fieldName in fields) {
      result[fieldName] = fields[fieldName];
    }
  }

  if (schema.defaults) {
    for (const [fieldName, defaultValue] of Object.entries(schema.defaults)) {
      if (!(fieldName in result)) {
        result[fieldName] = defaultValue;
      }
    }
  }

  return true;
}

function parseReprObject(repr) {
  const fields = parseTupleFields(repr);
  if (!fields) {
    return null;
  }

  const eventType = extractEventType(fields);
  if (!eventType || !isValidEventType(eventType)) {
    return null;
  }

  const schema = getEventSchema(eventType);
  const result = { event: eventType };

  if (!hydrateSchemaFields(fields, schema, result, true)) {
    return null;
  }

  return result;
}

function parseReprObjectLenient(repr) {
  const fields = parseTupleFields(repr);
  if (!fields) {
    return null;
  }

  const eventType = extractEventType(fields);
  if (!eventType) {
    return null;
  }

  const result = { event: eventType };
  if (isValidEventType(eventType)) {
    const schema = getEventSchema(eventType);
    hydrateSchemaFields(fields, schema, result, false);
  }

  return result;
}

function parseStructuredObject(value, strict = true) {
  const fields = parseStructuredFields(value);
  if (!fields) {
    return null;
  }

  const eventType = extractEventType(fields);
  if (!eventType || !isValidEventType(eventType)) {
    return null;
  }

  const schema = getEventSchema(eventType);
  const result = { event: eventType };

  if (!hydrateSchemaFields(fields, schema, result, strict)) {
    return null;
  }

  return result;
}

export function parseContractEvent(repr) {
  if (!repr) {
    return null;
  }

  try {
    return typeof repr === 'string' ? parseReprObject(repr) : parseStructuredObject(repr, true);
  } catch {
    return null;
  }
}

export function parseContractEventLenient(repr) {
  if (!repr) {
    return null;
  }

  try {
    return typeof repr === 'string' ? parseReprObjectLenient(repr) : parseStructuredObject(repr, false);
  } catch {
    return null;
  }
}
