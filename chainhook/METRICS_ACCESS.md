# Metrics and Health Check Access Control

This document describes how to configure and access the metrics and health check endpoints in production environments.

## Overview

The chainhook service exposes two diagnostic endpoints:

- **Health Check** (`/health`): Always accessible for orchestration and monitoring
- **Metrics** (`/metrics`): Operational metrics with optional authentication

## Health Check Endpoint

The health check endpoint is always enabled and publicly accessible. It returns the current service status and basic diagnostics.

```bash
curl http://localhost:3100/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-20T10:30:45.123Z",
  "uptime_seconds": 3600,
  "storage": {
    "connected": true,
    "latency_ms": 2
  },
  "retention_days": 30
}
```

Use the health check for:
- Kubernetes/orchestration readiness probes
- Load balancer health checks
- Service status monitoring
- Operational dashboards

## Metrics Endpoint

The metrics endpoint exposes detailed operational metrics about event processing, throughput, and system performance.

### Access Control Configuration

Configure metrics access via environment variables:

```bash
# Optional: Require authentication to access metrics
METRICS_AUTH_TOKEN=your-secure-random-token

# Keep health checks enabled (default: true)
HEALTH_CHECK_ALWAYS_ENABLED=true
```

### Public Metrics (No Authentication)

If `METRICS_AUTH_TOKEN` is not set, the metrics endpoint is publicly accessible:

```bash
curl http://localhost:3100/metrics
```

Response:
```json
{
  "eventsIndexed": 45230,
  "eventsDuplicated": 1203,
  "eventsProcessed": 46433,
  "requestsReceived": 340,
  "requestsSuccessful": 338,
  "requestsFailed": 2,
  "averageProcessingTimeMs": 124.5,
  "lastIndexTime": "2025-01-20T10:30:40.000Z",
  "uptime_ms": 3600000,
  "storage": {
    "indexed_events": 45230,
    "duplicate_events": 1203,
    "storage_size_bytes": 1048576
  }
}
```

### Protected Metrics (With Authentication)

When `METRICS_AUTH_TOKEN` is configured, all metrics requests must include a valid Bearer token:

```bash
# Without token: 401 Unauthorized
curl http://localhost:3100/metrics

# With token: Successful
curl -H "Authorization: Bearer your-secure-random-token" \
  http://localhost:3100/metrics
```

## Production Setup Patterns

### Pattern 1: Reverse Proxy with IP Allowlist

For production deployments, use a reverse proxy (nginx, traefik, etc.) to gate metrics access by IP:

```nginx
# nginx configuration
server {
    listen 3100;
    server_name _;

    location /health {
        proxy_pass http://localhost:3101;
    }

    location /metrics {
        # Only allow monitoring systems
        allow 10.0.0.0/8;          # Internal monitoring
        allow 192.168.1.100/32;    # Prometheus server
        deny all;

        proxy_pass http://localhost:3101;
    }

    location / {
        proxy_pass http://localhost:3101;
    }
}
```

Run the chainhook service on localhost:3101 and expose public traffic through nginx on 3100.

### Pattern 2: Bearer Token Authentication

For deployments without network isolation, use `METRICS_AUTH_TOKEN`:

```bash
# Generate secure token (example)
openssl rand -base64 32

# Set in environment
export METRICS_AUTH_TOKEN="your-generated-token"
```

Configure Prometheus or other monitoring tools to include the token:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'chainhook'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:3100']
    bearer_token: 'your-generated-token'
```

### Pattern 3: Environment-Based Configuration

Different access strategies per environment:

```bash
# Development: Open access
# (METRICS_AUTH_TOKEN not set)

# Staging: Bearer token
METRICS_AUTH_TOKEN=staging-token-here

# Production: Strict access
# Use reverse proxy + bearer token combination
METRICS_AUTH_TOKEN=production-secure-random-token
```

## Metrics Reference

| Metric | Type | Description |
|--------|------|-------------|
| `eventsIndexed` | Counter | Total events successfully indexed |
| `eventsDuplicated` | Counter | Events filtered as duplicates |
| `eventsProcessed` | Counter | Total events processed (indexed + duplicated) |
| `requestsReceived` | Counter | Total webhook requests received |
| `requestsSuccessful` | Counter | Webhook requests processed successfully |
| `requestsFailed` | Counter | Webhook requests that failed |
| `averageProcessingTimeMs` | Gauge | Average processing time in milliseconds |
| `lastIndexTime` | Timestamp | ISO timestamp of last event indexing |
| `uptime_ms` | Gauge | Service uptime in milliseconds |
| `storage.indexed_events` | Counter | Events in storage |
| `storage.duplicate_events` | Counter | Duplicate records in storage |
| `storage.storage_size_bytes` | Gauge | Current storage size |

## Security Considerations

1. **Health Checks Always Available**: The `/health` endpoint cannot be gated with authentication, ensuring orchestration systems can monitor service availability.

2. **Metrics Token Strength**: Use cryptographically secure random tokens (minimum 32 bytes) for production deployments.

3. **Transport Security**: Always use HTTPS/TLS in production, even with authentication enabled.

4. **Token Rotation**: Implement token rotation procedures in production systems. Metrics access does not compromise data integrity, but tokens should still follow rotation policies.

5. **Reverse Proxy Recommended**: For defense-in-depth, use both a reverse proxy with network controls and optional bearer token authentication.

## Monitoring Access

Monitor metrics access in logs for suspicious patterns:

```bash
# Successful metrics request
2025-01-20T10:30:45.123Z GET /metrics 200

# Unauthorized metrics request
2025-01-20T10:30:46.456Z GET /metrics 401
```

## Troubleshooting

**Q: Metrics endpoint returns 401 Unauthorized**

A: Ensure the Authorization header includes the correct token format:
```bash
# Correct format
Authorization: Bearer your-token-here

# Incorrect formats won't work
Authorization: your-token-here
Authorization: Basic your-token-here
```

**Q: Want to disable metrics authentication but it's set**

A: Clear the `METRICS_AUTH_TOKEN` environment variable. The endpoint checks only if the token is non-empty.

**Q: Health check is down but service is running**

A: The health check depends on successful database connectivity. Verify database access and review service logs.
