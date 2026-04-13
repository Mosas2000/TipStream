# Chainhook Service Deployment Guide

## Overview

The TipStream chainhook service is a durable, production-ready webhook receiver for on-chain events. It provides idempotent event ingestion with deduplication, monitoring, and security hardening.

## Architecture

### Event Processing Pipeline

1. **Webhook Ingestion**: Receives Chainhook events via POST /api/chainhook/events
2. **Deduplication**: Filters duplicate events using stable keys (txId, blockHeight, contract, event type)
3. **Validation**: Validates event structure and required fields
4. **Storage**: Persists to PostgreSQL in production, with an in-memory mode for tests and local development
5. **Metrics**: Records statistics for monitoring and alerting

### Persistence

Production deployments use PostgreSQL via `DATABASE_URL`. For local or test runs:
- Use `CHAINHOOK_STORAGE=memory` when a database is not available
- Use `CHAINHOOK_STORAGE=postgres` and `DATABASE_URL` for production
- Configure `CHAINHOOK_RETENTION_DAYS` for compaction policy
- Add backup/recovery procedures around the database, not a local JSON file

## Configuration

### Environment Variables

```bash
# Server
PORT=3100                              # HTTP listen port

# Authentication
CHAINHOOK_AUTH_TOKEN=<bearer-token>   # Optional bearer token for webhook auth

# Storage
CHAINHOOK_STORAGE=postgres             # postgres or memory
DATABASE_URL=postgres://...            # Required when CHAINHOOK_STORAGE=postgres
CHAINHOOK_RETENTION_DAYS=30            # Event retention window in days

# CORS Security
CORS_ALLOWED_ORIGINS=https://app.example.com,https://api.example.com
                                       # Default: http://localhost:3000,http://localhost:3001

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100            # Max requests per window
RATE_LIMIT_WINDOW_MS=60000             # Time window in milliseconds

# Logging
LOG_LEVEL=INFO                         # DEBUG, INFO, WARN, ERROR
```

## Security

### Authentication

Optional bearer token validation with constant-time comparison:

```bash
export CHAINHOOK_AUTH_TOKEN="your-secret-token-here"
```

### CORS

Configurable origin allowlist for production safety:

```bash
CORS_ALLOWED_ORIGINS=https://api.example.com,https://app.example.com
```

### Rate Limiting

Per-IP rate limiting to prevent abuse:

```bash
RATE_LIMIT_MAX_REQUESTS=100              # per 60 seconds
RATE_LIMIT_WINDOW_MS=60000
```

## Running the Service

### Development

```bash
cd chainhook
npm install
npm start
```

### Production

```bash
export NODE_ENV=production
export PORT=3100
export CHAINHOOK_AUTH_TOKEN="secure-random-token"
export CHAINHOOK_STORAGE=postgres
export DATABASE_URL="postgres://user:pass@host:5432/tipstream"
export CORS_ALLOWED_ORIGINS="https://api.example.com"
node server.js
```

## Monitoring

### Health Check

```bash
curl http://localhost:3100/health
```

### Metrics

```bash
curl http://localhost:3100/metrics
```

Metrics include:
- Events indexed and deduplicated
- Request success/failure rates
- Processing times
- Service uptime

### Logging

Structured JSON logging for log aggregation systems:

```json
{"timestamp":"2024-04-10T14:00:00.000Z","level":"INFO","service":"chainhook","message":"Events indexed"}
```

## API Reference

### POST /api/chainhook/events

Ingest webhook payload.

**Requirements:**
- Bearer token (if CHAINHOOK_AUTH_TOKEN is set)
- Request body under 10 MB

### GET /api/tips

List indexed tip events (paginated).

**Parameters:** `limit`, `offset`

### GET /api/tips/user/:address

Get tips for a Stacks address.

### GET /api/tips/:id

Get tip by ID.

### GET /api/stats

Aggregate statistics.

### GET /api/admin/events

Admin event log.

### GET /api/admin/bypasses

Detected bypass attempts.

### GET /health

Health check.

### GET /metrics

Service metrics.

## Recovery Procedures

### Data Corruption

1. Stop service
2. Verify the database is reachable and the `DATABASE_URL` is correct
3. Restore from the last known-good database backup or snapshot
4. Restart the service after the datastore is repaired

### Graceful Shutdown

The service handles SIGTERM and SIGINT by:
1. Stopping request acceptance
2. Flushing pending writes
3. Closing HTTP server
4. Exiting cleanly

## Scaling Considerations

### Current Limitations

- Single-threaded Node.js
- Local file storage is no longer used for production persistence
- In-memory rate limiter

### Production Enhancements

- Multiple instances behind load balancer
- External database (PostgreSQL)
- Distributed rate limiting
- Caching layer (Redis)
- Event stream storage (Kafka, Kinesis)

## Testing

```bash
cd chainhook
npm test
```

Tests cover:
- Event deduplication
- Bearer token validation
- CORS enforcement
- Rate limiting
- Event parsing
