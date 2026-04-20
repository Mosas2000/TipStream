# Troubleshooting and Support Guide

This guide helps diagnose and resolve common issues with metrics access control.

## Diagnosing Issues

### Metrics Endpoint Returns 401

**Symptoms:**
- Prometheus cannot scrape metrics
- Manual curl requests return 401 Unauthorized
- Monitoring dashboards show no data

**Diagnosis:**

1. Check if METRICS_AUTH_TOKEN is configured:
```bash
echo $METRICS_AUTH_TOKEN
# Should output token value, not empty
```

2. Check service logs:
```bash
journalctl -u chainhook -n 20
# Look for errors about metrics or authentication
```

3. Test health endpoint:
```bash
curl http://localhost:3100/health
# Should return 200 OK
# If fails, service may not be running
```

**Resolution:**

If token is not set:
```bash
# Set token in environment
export METRICS_AUTH_TOKEN="your-token-here"
systemctl restart chainhook
```

If token is set but still getting 401:
```bash
# Verify exact token value
TOKEN=$(echo $METRICS_AUTH_TOKEN | od -A x -t x1z)
echo "Token bytes: $TOKEN"

# Test with token
curl -H "Authorization: Bearer $METRICS_AUTH_TOKEN" \
  http://localhost:3100/metrics
```

### Metrics Endpoint Returns 500

**Symptoms:**
- Metrics endpoint returns HTTP 500
- Error message in response

**Diagnosis:**

1. Check service logs:
```bash
journalctl -u chainhook -f
# Look for stack traces or errors
```

2. Check database connectivity:
```bash
curl http://localhost:3100/health | jq '.ok'
# Should be true if database is accessible
```

3. Check metrics endpoint directly:
```bash
curl -H "Authorization: Bearer $METRICS_AUTH_TOKEN" \
  http://localhost:3100/metrics -v
# Look for error message in response
```

**Resolution:**

If database is down:
```bash
# Check database status
systemctl status postgresql
# or
docker ps | grep postgres

# Restart if needed
systemctl restart postgresql
```

If service is crashing:
```bash
# Check Node.js logs
journalctl -u chainhook -p err -n 50

# Restart service
systemctl restart chainhook

# Check if service stays running
sleep 5 && systemctl status chainhook
```

### Prometheus Cannot Scrape Metrics

**Symptoms:**
- Prometheus shows "unavailable" or "down"
- Target status page shows error
- No metrics in Grafana

**Diagnosis:**

1. Check Prometheus configuration:
```bash
cat /etc/prometheus/prometheus.yml | grep -A 5 chainhook
# Verify bearer_token is set
```

2. Test scrape URL directly from Prometheus host:
```bash
# SSH to Prometheus server
curl -i -H "Authorization: Bearer $TOKEN" \
  http://chainhook-host:3100/metrics | head -20
```

3. Check Prometheus logs:
```bash
journalctl -u prometheus -f
# Look for connection errors
```

**Resolution:**

If bearer token is wrong:
```bash
# Get correct token
echo $METRICS_AUTH_TOKEN

# Update Prometheus config
sudo nano /etc/prometheus/prometheus.yml
# Update bearer_token value

# Reload Prometheus
curl -X POST http://localhost:9090/-/reload
```

If network connectivity is broken:
```bash
# Test DNS resolution
nslookup chainhook.example.com

# Test connectivity
ping -c 1 chainhook.example.com
nc -zv chainhook.example.com 3100

# Check firewall
sudo ufw status | grep 3100
```

If TLS certificate is invalid:
```bash
# Check certificate
openssl s_client -connect chainhook.example.com:443 -showcerts

# Verify certificate matches domain
openssl s_client -connect chainhook.example.com:443 | \
  openssl x509 -noout -text | grep -E "CN=|DNS="
```

### Health Check Failing

**Symptoms:**
- Health endpoint returns {"ok": false}
- Service shows unhealthy
- Orchestration systems mark service as down

**Diagnosis:**

1. Check which dependency is failing:
```bash
curl http://localhost:3100/health | jq '.'
# Check each field for false values
```

2. Test database:
```bash
psql $DATABASE_URL -c "SELECT 1;"
# Should succeed

# Check credentials
echo $DATABASE_URL
```

3. Test Redis:
```bash
redis-cli -u $REDIS_URL ping
# Should return PONG
```

**Resolution:**

If database connection fails:
```bash
# Verify connection string
echo $DATABASE_URL

# Test manually
psql postgresql://user:pass@host:5432/db

# Check database is running
docker ps | grep postgres
```

If Redis connection fails:
```bash
# Verify Redis URL
echo $REDIS_URL

# Test connection
redis-cli ping

# Check Redis is running
docker ps | grep redis
systemctl status redis
```

### Token Validation Failures

**Symptoms:**
- Valid tokens are rejected
- Authorization header is correct but still get 401

**Diagnosis:**

1. Check exact token being sent:
```bash
# Compare tokens byte-by-byte
TOKEN="$METRICS_AUTH_TOKEN"
echo -n "$TOKEN" | od -A x -t x1z

# Compare with configured value
ps aux | grep chainhook | grep METRICS_AUTH_TOKEN | od -A x -t x1z
```

2. Check authorization header format:
```bash
# Use verbose curl to see exact header
curl -v -H "Authorization: Bearer $TOKEN" \
  http://localhost:3100/metrics 2>&1 | grep "Authorization:"
```

3. Check for whitespace issues:
```bash
# Ensure no leading/trailing whitespace
TOKEN="$(echo $METRICS_AUTH_TOKEN | xargs)"
echo "Token length: ${#TOKEN}"

# Try with explicit formatting
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3100/metrics
```

**Resolution:**

If token has whitespace:
```bash
# Remove whitespace from token
export METRICS_AUTH_TOKEN="$(echo $METRICS_AUTH_TOKEN | xargs)"

# Restart service
systemctl restart chainhook

# Verify
curl -H "Authorization: Bearer $METRICS_AUTH_TOKEN" \
  http://localhost:3100/metrics
```

If header format is wrong:
```bash
# Correct format: "Authorization: Bearer <token>"
# NOT: "Authorization: token <token>"
# NOT: "Authorization: <token>"

curl -H "Authorization: Bearer $(cat /etc/chainhook/token)" \
  http://localhost:3100/metrics
```

### High Unauthorized Request Rate

**Symptoms:**
- Logs show many 401 responses
- Possible brute force attack

**Diagnosis:**

1. Check access logs for patterns:
```bash
grep " 401 " /var/log/nginx/metrics.log | head -20
# Look for repeated IPs or patterns
```

2. Count requests by source:
```bash
grep " 401 " /var/log/nginx/metrics.log | \
  awk '{print $1}' | sort | uniq -c | sort -rn
```

3. Check for brute force attempts:
```bash
# Monitor in real-time
tail -f /var/log/nginx/metrics.log | \
  grep -v "Authorization: Bearer" | \
  grep " 401 "
```

**Resolution:**

If attack is from specific IP:
```bash
# Block IP immediately
sudo ufw deny from <IP>

# Verify block
sudo ufw status | grep <IP>
```

If attack is from multiple IPs:
```bash
# Enable rate limiting
limit_req_zone $binary_remote_addr zone=metrics_limit:10m rate=10r/s;
limit_req zone=metrics_limit burst=20 nodelay;

# Or block at firewall level
# (contact infrastructure team)
```

If using wrong token:
```bash
# Check what token they're trying
grep "401" /var/log/nginx/metrics.log | \
  grep "authorization=" | \
  tail -5

# If it's a known old token, it may be outdated
# Notify users to update their configuration
```

## Performance Issues

### Slow Metrics Response

**Symptoms:**
- Metrics endpoint takes > 1 second to respond
- Prometheus scrape timeout

**Diagnosis:**

1. Measure response time:
```bash
time curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3100/metrics > /dev/null
```

2. Check system resources:
```bash
# CPU usage
top -b -n 1 | grep chainhook

# Memory usage
free -h

# Disk I/O
iostat -x 1 5
```

3. Check database performance:
```bash
# Slow queries
psql $DATABASE_URL -c "\x on" << EOF
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
EOF
```

**Resolution:**

If database is slow:
```bash
# Run VACUUM and ANALYZE
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Check for missing indexes
psql $DATABASE_URL -c "\d+ <table_name>"
```

If system resources are exhausted:
```bash
# Kill any hanging processes
pkill -f "curl.*metrics"

# Restart service
systemctl restart chainhook

# Monitor resources
watch -n 1 'free -h && ps aux | grep chainhook'
```

## Getting Help

### Collect Diagnostic Information

```bash
#!/bin/bash

echo "=== Chainhook Diagnostic Report ===" > diagnostics.log

echo -e "\n=== Service Status ===" >> diagnostics.log
systemctl status chainhook >> diagnostics.log 2>&1

echo -e "\n=== Recent Logs ===" >> diagnostics.log
journalctl -u chainhook -n 50 >> diagnostics.log 2>&1

echo -e "\n=== Metrics Endpoint Test ===" >> diagnostics.log
curl -v -H "Authorization: Bearer $METRICS_AUTH_TOKEN" \
  http://localhost:3100/metrics >> diagnostics.log 2>&1 | head -30

echo -e "\n=== Health Check ===" >> diagnostics.log
curl -v http://localhost:3100/health >> diagnostics.log 2>&1

echo -e "\n=== Environment ===" >> diagnostics.log
echo "NODE_ENV: $NODE_ENV" >> diagnostics.log
echo "LOG_LEVEL: $LOG_LEVEL" >> diagnostics.log
echo "METRICS_AUTH_TOKEN: $(echo $METRICS_AUTH_TOKEN | head -c 5)..." >> diagnostics.log

echo -e "\n=== System Resources ===" >> diagnostics.log
free -h >> diagnostics.log
df -h >> diagnostics.log

echo "Diagnostic information saved to: diagnostics.log"
```

### Contact Support

When reporting issues, include:

1. Diagnostic report (above)
2. Service logs (journalctl)
3. Exact error message
4. Steps to reproduce
5. Environment details (OS, Node version, etc.)
6. Recent changes or updates

Example:
```
Subject: Metrics access control issue

Environment:
- OS: Ubuntu 20.04 LTS
- Node: v18.12.0
- Chainhook version: 1.2.3

Issue:
Prometheus cannot scrape metrics endpoint. Returns 401 Unauthorized
even with correct bearer token.

Steps to reproduce:
1. Set METRICS_AUTH_TOKEN=test-token-123
2. Start service
3. Run: curl -H "Authorization: Bearer test-token-123" http://localhost:3100/metrics
4. Get 401 response

Logs:
[paste diagnostic report here]
```
