# Deployment Guide for Metrics Access Control

This guide provides operational procedures for deploying the metrics access control feature in production environments.

## Prerequisites

- Node.js 18+
- Understanding of bearer token authentication
- Access to environment configuration systems
- Monitoring/metrics collection infrastructure (optional)

## Deployment Steps

### Step 1: Generate a Secure Token

Generate a strong random token for production metrics access:

```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Output example: `KGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN=`

### Step 2: Configure Environment Variables

Update your deployment environment with the metrics token:

```bash
# For Docker
docker run -e METRICS_AUTH_TOKEN="KGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN=" \
  tipstream-chainhook

# For Kubernetes ConfigMap
kubectl create configmap chainhook-config \
  --from-literal=METRICS_AUTH_TOKEN="KGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN=" \
  -n production

# For systemd service
cat > /etc/environment.d/chainhook-prod
METRICS_AUTH_TOKEN=KGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN=

# For .env file
echo "METRICS_AUTH_TOKEN=KGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN=" >> .env.production
```

### Step 3: Test Token Configuration

Before deploying to production, verify token configuration in staging:

```bash
# Test without token (should fail if configured)
curl -i http://localhost:3100/metrics

# Test with token (should succeed)
curl -i -H "Authorization: Bearer KGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN=" \
  http://localhost:3100/metrics

# Health check should work regardless
curl -i http://localhost:3100/health
```

### Step 4: Configure Monitoring Systems

Update Prometheus or similar monitoring tools to use the token:

```yaml
# prometheus.yml configuration
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'chainhook-metrics'
    metrics_path: '/metrics'
    bearer_token: 'KGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN='
    static_configs:
      - targets: ['chainhook.example.com:3100']
```

### Step 5: Configure Reverse Proxy (Recommended)

For defense-in-depth, use a reverse proxy like nginx:

```nginx
upstream chainhook_backend {
    server 127.0.0.1:3101;
}

server {
    listen 3100;
    server_name chainhook.example.com;

    # Health check - always accessible
    location /health {
        proxy_pass http://chainhook_backend;
        access_log /var/log/nginx/chainhook-health.log;
    }

    # Metrics - require IP allowlist
    location /metrics {
        # IP whitelist for monitoring infrastructure
        allow 10.0.1.100;       # Prometheus server
        allow 10.0.2.50;        # Grafana server
        allow 192.168.1.0/24;   # Corporate network
        deny all;

        proxy_pass http://chainhook_backend;
        proxy_set_header Authorization $http_authorization;
        access_log /var/log/nginx/chainhook-metrics.log;
    }

    # API endpoints
    location / {
        proxy_pass http://chainhook_backend;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Token Management

### Token Rotation Schedule

Implement quarterly token rotation in production:

```bash
# Create new token
NEW_TOKEN=$(openssl rand -base64 32)

# Update environment
export METRICS_AUTH_TOKEN="$NEW_TOKEN"

# Restart service
systemctl restart chainhook

# Update monitoring configuration
# (Update Prometheus, Grafana, or other tools)

# Document rotation in audit log
echo "$(date -u) - Metrics token rotated" >> /var/log/chainhook-audit.log
```

### Token Storage Best Practices

- Store tokens in secure vaults (HashiCorp Vault, AWS Secrets Manager, etc.)
- Never commit tokens to version control
- Use environment variables or secrets management systems
- Implement access logging for token usage
- Audit token reads and modifications

## Monitoring and Verification

### Verify Metrics Endpoint Access

```bash
# Monitor successful and failed metrics access
tail -f /var/log/chainhook/access.log | grep "/metrics"

# Expected successful request
127.0.0.1 - - [20/Jan/2025 10:30:45 +0000] "GET /metrics HTTP/1.1" 200

# Expected unauthorized request
127.0.0.1 - - [20/Jan/2025 10:30:46 +0000] "GET /metrics HTTP/1.1" 401
```

### Alert Configuration

Configure alerts for suspicious metrics access patterns:

```yaml
# Example Prometheus alert
groups:
  - name: chainhook
    rules:
      - alert: UnauthorizedMetricsAccess
        expr: rate(chainhook_request_unauthorized[5m]) > 5
        for: 5m
        annotations:
          summary: "High rate of unauthorized metrics requests"
          description: "{{ $value }} unauthorized requests per second"

      - alert: MetricsAccessDown
        expr: up{job="chainhook-metrics"} == 0
        for: 5m
        annotations:
          summary: "Metrics endpoint is down"
```

## Troubleshooting

### Issue: 401 Unauthorized on Metrics

**Causes:**
- Token not configured
- Token mismatch
- Malformed Authorization header
- Token expired

**Resolution:**
```bash
# Verify token is set
echo $METRICS_AUTH_TOKEN

# Check token format
curl -i -H "Authorization: Bearer $METRICS_AUTH_TOKEN" http://localhost:3100/metrics

# View service logs
journalctl -u chainhook -f
```

### Issue: Health Check Unavailable

**Causes:**
- Service crashed
- Database connection issue
- Port binding conflict

**Resolution:**
```bash
# Test health endpoint
curl http://localhost:3100/health

# Check service status
systemctl status chainhook

# Review logs
tail -n 100 /var/log/chainhook/app.log
```

### Issue: Metrics Data Not Updating

**Causes:**
- Service not processing events
- Database issue
- Metrics collection stale

**Resolution:**
```bash
# Check if service is receiving events
curl http://localhost:3100/health

# Verify metrics timestamp
curl -H "Authorization: Bearer $METRICS_AUTH_TOKEN" http://localhost:3100/metrics | jq '.lastIndexTime'

# Check event ingest logs
grep "Events indexed" /var/log/chainhook/app.log | tail -5
```

## Rollback Procedure

If metrics access control causes issues:

1. Remove `METRICS_AUTH_TOKEN` environment variable
2. Restart service: `systemctl restart chainhook`
3. Verify metrics are accessible: `curl http://localhost:3100/metrics`
4. Investigate root cause in logs
5. Implement fix
6. Re-enable metrics access control with new configuration

## Security Audit Checklist

- [ ] Token is at least 32 bytes (256 bits) of random data
- [ ] Token is stored in secure secrets management system
- [ ] Token is never logged or exposed in error messages
- [ ] Token rotation schedule is documented
- [ ] All monitoring systems have updated credentials
- [ ] Reverse proxy IP allowlist is configured (if applicable)
- [ ] Health check endpoint is accessible without authentication
- [ ] Metrics access is monitored and alerted
- [ ] Audit logs capture all metrics access attempts
- [ ] TLS/HTTPS is enabled for production metrics endpoint
