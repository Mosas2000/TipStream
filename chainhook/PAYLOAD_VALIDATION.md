# Chainhook Payload Validation

## Overview

The chainhook service validates incoming webhook payloads to ensure they contain all required fields before processing. This prevents silent failures and provides clear error messages for malformed or incomplete payloads.

## Validation Rules

### Payload Structure

The root payload must:
- Be a valid object
- Contain an `apply` field that is an array

**Error**: `invalid payload structure: payload.apply must be an array`

### Block Structure

Each block in the `apply` array must:
- Be a valid object
- Contain a `block_identifier` object
- Have a `block_identifier.index` number field

**Error**: `invalid block structure: block at index N missing block_identifier`

### Transaction Structure

Each transaction in a block must:
- Be a valid object
- Contain a `transaction_identifier` object
- Have a `transaction_identifier.hash` string field

**Error**: `invalid transaction structure: transaction at block N, tx M missing transaction_identifier`

### Event Validation

Events without a `value` field are logged as warnings but do not cause the request to fail:

**Warning Log**: `Event missing value field`

## Error Responses

When validation fails, the service returns:

```json
{
  "error": "bad_request",
  "message": "invalid payload structure: payload.apply must be an array",
  "request_id": "..."
}
```

**Status Code**: 400 Bad Request

## Valid Payload Example

```json
{
  "apply": [
    {
      "block_identifier": {
        "index": 100,
        "hash": "0xblock"
      },
      "timestamp": 1700000000000,
      "transactions": [
        {
          "transaction_identifier": {
            "hash": "0xtx"
          },
          "metadata": {
            "receipt": {
              "events": [
                {
                  "type": "SmartContractEvent",
                  "data": {
                    "contract_identifier": "SP123.contract",
                    "value": {
                      "event": "tip-sent"
                    }
                  }
                }
              ]
            }
          }
        }
      ]
    }
  ]
}
```

## Benefits

1. **Early Detection**: Catches malformed payloads before processing
2. **Clear Errors**: Provides specific error messages with context
3. **Operator Visibility**: Logs warnings for incomplete events
4. **Debugging**: Includes block and transaction indices in error messages
5. **Reliability**: Prevents silent failures from missing fields

## Testing

Validation is tested at multiple levels:

- Unit tests for each validation function
- Integration tests for malformed payloads
- Edge cases for missing fields
- Success cases for valid payloads

Run tests with:
```bash
npm test
```
