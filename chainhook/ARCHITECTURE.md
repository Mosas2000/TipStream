# Chainhook Architecture

## Deployment Topology

The chainhook service is a small HTTP ingestion tier that should run behind a
load balancer or reverse proxy in production.

### Recommended Layout

- Chainhook webhook receivers run as stateless application instances
- PostgreSQL stores the canonical event log
- A reverse proxy terminates TLS and forwards requests to the service
- Prometheus or another monitor scrapes `/health` and `/metrics`
- The service can be horizontally scaled because the event log is shared

### Request Flow

1. Chainhook delivers a webhook to `POST /api/chainhook/events`
2. The service validates the bearer token when configured
3. The service applies request rate limiting and origin allowlisting
4. Event keys are generated from immutable chain data
5. Duplicate deliveries are ignored by the datastore
6. Events are stored in PostgreSQL and exposed through read-only APIs

## Authentication Expectations

### Webhook Authentication

The service accepts an optional bearer token:

```bash
CHAINHOOK_AUTH_TOKEN=your-long-random-token
```

Recommendations:
- Set the token in production
- Rotate it during incident response or scheduled maintenance
- Keep the token out of source control and shell history

### Origin Allowlisting

Restrict browser-origin access to trusted domains:

```bash
CORS_ALLOWED_ORIGINS=https://app.example.com,https://api.example.com
```

Recommendations:
- Do not use wildcard origins in production
- Keep the allowlist as small as possible
- Update the allowlist when new trusted frontends are introduced

## Persistence Model

### Production

- `CHAINHOOK_STORAGE=postgres`
- `DATABASE_URL` must point to the shared PostgreSQL instance
- `CHAINHOOK_RETENTION_DAYS` controls compaction

### Local Development and Testing

- `CHAINHOOK_STORAGE=memory` uses the in-memory store
- Suitable for tests and quick local checks
- Not intended for production deployment

## Operational Endpoints

- `GET /health` reports service and datastore status
- `GET /metrics` reports request, ingest, and storage metrics
- `GET /api/tips` exposes parsed tip events
- `GET /api/stats` exposes aggregate tip counts and volume

## Recovery Model

If the application process restarts:
- The in-memory rate limiter resets
- The PostgreSQL event log remains intact
- Duplicate webhooks remain idempotent because the event key is stable
- The service resumes without JSON file recovery steps

If PostgreSQL is unavailable:
- Ingest requests fail fast
- Health checks report the datastore issue
- Restore from the latest database backup or snapshot

## Related Files

- `DEPLOYMENT.md`
- `OPERATIONS.md`
- `RECOVERY.md`
- `storage.js`
- `server.js`
