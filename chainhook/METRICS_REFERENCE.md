# Metrics Access Control Reference

This document provides quick reference for metrics access control configuration options and behaviors.

## Configuration Variables

### METRICS_AUTH_TOKEN

- **Type:** String
- **Default:** Empty string
- **Required:** No
- **Description:** Bearer token required to access the metrics endpoint. When set, enables authentication on `/metrics`. When empty, metrics are publicly accessible.

```bash
# Enable metrics authentication
METRICS_AUTH_TOKEN="KGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN="

# Disable metrics authentication
METRICS_AUTH_TOKEN=""
```

### HEALTH_CHECK_ALWAYS_ENABLED

- **Type:** String (boolean)
- **Default:** "true"
- **Required:** No
- **Description:** Controls whether health check endpoint is always accessible without authentication. Currently always enabled for operational safety.

```bash
HEALTH_CHECK_ALWAYS_ENABLED="true"
```

## Endpoint Behavior Matrix

| Endpoint | Auth Required | Response Code (Success) | Response Code (Failure) | Use Case |
|----------|---------------|------------------------|------------------------|----------|
| `/health` | No | 200 | 500* | Orchestration, load balancers, readiness probes |
| `/metrics` | Conditional** | 200 | 401 | Prometheus, Grafana, monitoring dashboards |
| `/api/ingest` | No | 200 | 400/500 | Chainhook event ingestion |
| `/api/tips/:id` | No | 200 | 404/500 | Public tip lookup |
| `/api/stats` | No | 200 | 500 | Public statistics |

**Only returns 500 if service is unhealthy (not an auth failure)
**Conditional: Required only if METRICS_AUTH_TOKEN is set

## Bearer Token Format

The Authorization header must follow the HTTP Bearer token specification:

```
Authorization: Bearer <token>
```

### Valid Examples

```
Authorization: Bearer KGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN=
Authorization: Bearer abc123def456ghi789jkl000mnopqrstuvwxyz
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Invalid Examples

```
Authorization: token KGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN=  # Wrong scheme
Authorization: Bearer  KGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN=  # Extra space
Authorization: BearerKGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN=  # Missing space
X-API-Key: KGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN=  # Wrong header
```

## Response Format

### Successful Metrics Response (200)

```json
{
  "methodProposal": 0,
  "methodTransferSTX": 0,
  "methodTransferToken": 0,
  "methodTransferNFT": 0,
  "eventsIndexed": 0,
  "lastIndexTime": 1705756245000,
  "activeRecipients": 0,
  "totalTipsProcessed": 0,
  "recipientStats": []
}
```

### Successful Health Response (200)

```json
{
  "ok": true,
  "blockHeight": 12345,
  "targetBlockHeight": 12346,
  "lastUpdated": 1705756245000
}
```

### Unauthorized Metrics Request (401)

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing bearer token"
}
```

## Deployment Patterns

### Pattern 1: No Authentication (Development)

```bash
METRICS_AUTH_TOKEN=""
```

- Metrics publicly accessible
- Health check always accessible
- Use only in development or air-gapped environments

### Pattern 2: Bearer Token Authentication

```bash
METRICS_AUTH_TOKEN="KGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN="
```

- Requires bearer token for metrics access
- Configure token in monitoring systems
- Recommended for cloud deployments with network isolation

### Pattern 3: Reverse Proxy with IP Allowlist

```nginx
location /metrics {
  allow 10.0.1.100;  # Prometheus
  allow 10.0.2.50;   # Grafana
  deny all;
}
```

- Proxy handles authentication
- Set `METRICS_AUTH_TOKEN=""` in application
- Recommended for corporate networks with known monitoring IPs

### Pattern 4: Hybrid (Proxy + Token)

```nginx
location /metrics {
  allow 10.0.0.0/8;  # Internal network
  deny all;
}
```

```bash
METRICS_AUTH_TOKEN="KGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN="
```

- Proxy restricts by IP or VPC
- Application enforces bearer token for additional security
- Recommended for high-security deployments

## Monitoring System Integration

### Prometheus Configuration

```yaml
scrape_configs:
  - job_name: 'chainhook'
    static_configs:
      - targets: ['localhost:3100']
    bearer_token: 'KGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN='
```

### Grafana Data Source

1. Create new Prometheus data source
2. Set URL: `http://chainhook.example.com:3100/metrics`
3. Set authentication: Bearer token
4. Enter token: `KGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN=`

### cURL Testing

```bash
# Without authentication (fails if token is set)
curl http://localhost:3100/metrics

# With bearer token
curl -H "Authorization: Bearer KGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN=" \
  http://localhost:3100/metrics

# Health check (always works)
curl http://localhost:3100/health
```

## Security Considerations

### Token Generation

Generate tokens using cryptographically secure random sources:

```bash
# OpenSSL (minimum 32 bytes / 256 bits)
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Token Comparison

The implementation uses constant-time comparison to prevent timing attacks:

- Token comparison always takes the same time regardless of mismatch position
- Protects against attackers using response time to guess token characters
- Transparent to users (no observable behavior change)

### Token Leakage Prevention

- Never log tokens or Authorization headers
- Never expose tokens in error messages
- Use TLS/HTTPS in production to prevent token interception
- Store tokens in secure vaults, never in source code
- Implement token rotation at least quarterly

## Troubleshooting Guide

| Symptom | Cause | Resolution |
|---------|-------|-----------|
| Metrics return 401 | Token not set or incorrect | Verify METRICS_AUTH_TOKEN value |
| Health check times out | Service crash or port binding issue | Check service logs and port availability |
| Prometheus can't scrape metrics | Missing bearer token config | Update Prometheus config with correct token |
| Bearer token not accepted | Malformed Authorization header | Verify header format: "Bearer <token>" |
| Metrics data is stale | Events not being indexed | Check ingest endpoint and event queue |

## Backward Compatibility

- Default behavior (empty METRICS_AUTH_TOKEN) maintains public access to metrics
- Existing Prometheus/Grafana configurations work without modification
- Authentication only applies when explicitly configured
- No breaking changes to metrics endpoint response format

## Future Enhancements

- Token expiration and refresh
- Multiple simultaneous tokens
- Token scoping (different tokens for different endpoints)
- Rate limiting per token
- Token usage analytics
