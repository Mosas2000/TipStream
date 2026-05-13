# Chainhook API Test Coverage

## Overview

Comprehensive integration test coverage for all chainhook API routes, including success and failure cases.

## Test Coverage

### Ingest Endpoint

- **POST /api/chainhook/events**
  - Successful event ingestion
  - Duplicate event handling
  - Malformed payload rejection
  - Oversized payload rejection
  - Rate limiting
  - Authentication

### Tips Endpoints

- **GET /api/tips**
  - Paginated tip listing
  - Invalid pagination limit
  - Negative offset rejection
  - Empty results

- **GET /api/tips/:id**
  - Successful tip retrieval by ID
  - Non-existent tip ID (404)
  - Invalid tip ID format (404)

- **GET /api/tips/user/:address**
  - Tips sent by user
  - Tips received by user
  - Invalid address format (400)
  - User with no tips (empty array)

### Statistics Endpoint

- **GET /api/stats**
  - Aggregate statistics calculation
  - Multiple senders and recipients
  - Zero statistics when no data

### Admin Endpoints

- **GET /api/admin/events**
  - Admin event retrieval
  - Multiple event types
  - Empty events list

- **GET /api/admin/bypasses**
  - Bypass detection
  - Empty bypasses list

### System Endpoints

- **GET /health**
  - Health check with storage details
  - Uptime tracking

- **GET /metrics**
  - Metrics retrieval
  - Storage statistics

## Test Statistics

- Total tests: 121
- All tests passing
- Coverage includes success and failure cases
- Integration tests run against in-memory storage

## Test Organization

Tests are organized by endpoint and functionality:
1. Core ingest flow
2. Tip retrieval and filtering
3. Statistics aggregation
4. Admin operations
5. Error handling
6. Edge cases

## Running Tests

```bash
npm test
```

## Test Helpers

- `request()` - Standard HTTP request helper
- `requestChunked()` - Chunked request helper for streaming tests
- `buildTipEvent()` - Tip event builder
- `buildAdminEvent()` - Admin event builder
- `buildEventPayload()` - Complete payload builder
