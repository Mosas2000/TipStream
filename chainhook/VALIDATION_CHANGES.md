# Payload Validation Changes

## Summary

Added comprehensive validation for chainhook webhook payloads to detect and reject malformed or incomplete data with clear error messages, addressing issue #348.

## Problem

The chainhook service was silently dropping malformed payloads and partial event objects without surfacing useful warnings or rejections. Operators had no clear signal when webhook payloads were malformed or incomplete, making debugging difficult.

## Solution

Implemented explicit validation for the required event envelope structure with detailed error messages and logging for incomplete events.

## Changes Made

### Core Implementation

1. **validatePayloadStructure()**
   - Validates payload is an object
   - Ensures `apply` field exists and is an array
   - Returns validation result with reason

2. **validateBlock()**
   - Validates block structure
   - Ensures `block_identifier` exists
   - Validates `block_identifier.index` is a number
   - Includes block index in error messages

3. **validateTransaction()**
   - Validates transaction structure
   - Ensures `transaction_identifier` exists
   - Validates `transaction_identifier.hash` exists
   - Includes block and transaction indices in error messages

4. **extractEvents() Updates**
   - Calls validation functions before processing
   - Throws BadRequestError for invalid structures
   - Logs warnings for events missing value fields
   - Provides context in error messages

### Testing

5. **validation-payload.test.js** (new)
   - Unit tests for validatePayloadStructure
   - Unit tests for validateBlock
   - Unit tests for validateTransaction
   - Tests for null, invalid types, and missing fields
   - Tests for valid structures

6. **server.integration.test.js Updates**
   - Test for missing apply field
   - Test for missing block_identifier
   - Test for missing transaction_identifier
   - Test for empty apply array (success case)

7. **server.test.js Updates**
   - Updated extractEvents test for validation behavior
   - Changed empty payload test to expect error

### Documentation

8. **PAYLOAD_VALIDATION.md** (new)
   - Complete validation rules
   - Error response formats
   - Valid payload examples
   - Common validation errors
   - Monitoring recommendations

9. **README.md Updates**
   - Added payload validation to features
   - Added validation section with overview
   - Link to detailed validation documentation

10. **package.json Update**
    - Updated description to include validation

## Acceptance Criteria

- [x] Validate the required event envelope explicitly
- [x] Log or reject malformed payloads with useful context
- [x] Add integration coverage for missing fields

## Validation Rules

### Required Fields

**Payload Level:**
- `apply` (array)

**Block Level:**
- `block_identifier` (object)
- `block_identifier.index` (number)

**Transaction Level:**
- `transaction_identifier` (object)
- `transaction_identifier.hash` (string)

### Error Handling

**Validation Failures**: Return 400 Bad Request with detailed message

**Missing Event Values**: Log warning but continue processing

## Test Results

- Total tests: 140 (increased from 121)
- All tests passing
- Added 19 new tests for validation
- Updated 1 existing test

## Error Response Format

```json
{
  "error": "bad_request",
  "message": "invalid payload structure: payload.apply must be an array",
  "request_id": "unique-id"
}
```

## Benefits

1. **Early Detection**: Catches malformed payloads immediately
2. **Clear Errors**: Specific error messages with context
3. **Operator Visibility**: Warnings logged for incomplete events
4. **Better Debugging**: Includes indices in error messages
5. **Prevents Silent Failures**: No more dropped events without notice
6. **Improved Reliability**: Ensures data quality before processing

## Backward Compatibility

This change is backward compatible for valid payloads. Only malformed payloads that were previously silently dropped will now receive explicit error responses.

## Monitoring

Operators should monitor:
- 400 Bad Request rate for validation failures
- Warning logs for events missing value fields
- Error message patterns to identify upstream issues

## Example Scenarios

### Before
- Malformed payload → Silent failure, no events indexed
- Missing fields → Events silently skipped
- No operator visibility

### After
- Malformed payload → 400 error with specific reason
- Missing fields → 400 error with field location
- Events without values → Warning logged with context
- Clear operator visibility and debugging information
