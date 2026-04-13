# Chainhook Service Recovery Guide

## Overview

This guide covers procedures for recovering the chainhook service from various failure scenarios while maintaining data integrity and operational continuity.

## Failure Scenarios

### Scenario 1: Datastore Corruption or Connection Failure

**Symptoms:**
- Service cannot connect to the configured database
- Health check reports datastore unavailable
- Ingest requests start failing with 500 responses

**Recovery Steps:**

1. Stop the service:
```bash
systemctl stop tipstream-chainhook
```

2. Capture the error from the logs and confirm `DATABASE_URL` is correct.

3. Restore the latest known-good database snapshot or backup.

4. Restart the service:
```bash
systemctl start tipstream-chainhook
```

5. Verify via health check:
```bash
curl http://localhost:3100/health
```

### Scenario 2: Disk Space Exhaustion

**Symptoms:**
- Events no longer being persisted
- ENOSPC errors in logs
- API returns 500 errors during ingestion

**Recovery Steps:**

1. Check disk usage:
```bash
du -sh /var/lib/postgresql
df -h
```

2. Reduce the retention window temporarily or scale the database storage.

3. Run a manual prune against the datastore if required.

4. Restart service:
```bash
systemctl restart tipstream-chainhook
```

### Scenario 3: Process Crashes

**Symptoms:**
- Service fails to start
- Error logs during startup
- Connection refused on port

**Recovery Steps:**

1. Check for port conflicts:
```bash
lsof -i :3100
```

2. Check logs for startup errors:
```bash
journalctl -u tipstream-chainhook -n 50 -r
```

3. Verify the database connection and credentials.

4. Attempt manual start with verbose logging:
```bash
LOG_LEVEL=DEBUG node server.js
```

5. If successful, restart via systemd:
```bash
systemctl restart tipstream-chainhook
```

### Scenario 4: Rate Limiter Memory Leak

**Symptoms:**
- Increasing memory usage over time
- Eventually OOM kills process
- High CPU after extended runtime

**Recovery Steps:**

1. Check memory usage:
```bash
ps aux | grep "node server.js"
```

2. The service automatically cleans up expired rate limit entries every 60 seconds.
   If issues persist:

3. Implement memory monitoring:
```bash
watch -n 5 'ps aux | grep "node server.js"'
```

4. Restart service with memory limits (if using systemd):
```ini
# In /etc/systemd/system/tipstream-chainhook.service
[Service]
MemoryMax=512M
MemoryAccounting=yes
```

5. Reload and restart:
```bash
systemctl daemon-reload
systemctl restart tipstream-chainhook
```

### Scenario 5: Authentication Token Compromise

**Symptoms:**
- Unauthorized webhook deliveries from unexpected IPs
- Spike in 401 responses followed by 200s
- Logs showing failed auth attempts

**Recovery Steps:**

1. Rotate token immediately:
```bash
export CHAINHOOK_AUTH_TOKEN=$(openssl rand -hex 32)
echo "New token: $CHAINHOOK_AUTH_TOKEN"
```

2. Update environment configuration:
```bash
# Update .env file or systemd environment
sed -i "s/CHAINHOOK_AUTH_TOKEN=.*/CHAINHOOK_AUTH_TOKEN=$CHAINHOOK_AUTH_TOKEN/" /etc/default/tipstream-chainhook
```

3. Restart service:
```bash
systemctl restart tipstream-chainhook
```

4. Update Chainhook webhook configuration with new token

5. Verify new token works:
```bash
curl -X POST http://localhost:3100/api/chainhook/events \
  -H "Authorization: Bearer $CHAINHOOK_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"apply":[]}'
```

## Backup and Restore

### Automated Backup Strategy

Create daily backups:

```bash
#!/bin/bash
BACKUP_DIR=/backups/chainhook
mkdir -p "$BACKUP_DIR"
pg_dump "$DATABASE_URL" > "$BACKUP_DIR/chainhook.$(date +%Y-%m-%d).sql"
aws s3 sync "$BACKUP_DIR" s3://backup-bucket/chainhook/
find "$BACKUP_DIR" -mtime +30 -delete
```

Schedule as cron job:

```bash
0 2 * * * /usr/local/bin/backup-chainhook.sh
```

### Full Service Restore

To restore from backup on new host:

1. Install Node.js:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs
```

2. Install PostgreSQL client tools:
```bash
apt-get install -y postgresql-client
```

3. Restore data:
```bash
aws s3 cp s3://backup-bucket/chainhook/chainhook.YYYY-MM-DD.sql /tmp/chainhook.sql
psql "$DATABASE_URL" < /tmp/chainhook.sql
```

4. Install and start service:
```bash
cd /opt/tipstream-chainhook
npm install --omit=dev
systemctl start tipstream-chainhook
```

5. Verify:
```bash
curl http://localhost:3100/health
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Event Ingestion Rate**: Should be consistent
```bash
curl http://localhost:3100/metrics | jq '.events_indexed'
```

2. **Deduplication Rate**: Low dedup = normal; high = possible upstream issue
```bash
curl http://localhost:3100/metrics | jq '.events_deduplicated'
```

3. **Success Rate**: Should be >99%
```bash
curl http://localhost:3100/metrics | jq '.success_rate_percent'
```

4. **Uptime**: Long running processes are healthy
```bash
curl http://localhost:3100/metrics | jq '.uptime_seconds'
```

### Alert Rules

```yaml
# Prometheus alert configuration
groups:
  - name: chainhook
    rules:
      - alert: ChainhookDown
        expr: up{job="chainhook"} == 0
        for: 2m
        
      - alert: ChainhookHighErrorRate
        expr: 1 - (chainhook_requests_successful / chainhook_requests_received) > 0.05
        for: 5m
        
      - alert: ChainhookMemoryHigh
        expr: process_resident_memory_bytes > 512000000
        for: 10m
```

## Testing Recovery Procedures

### Simulated Data Corruption

```bash
# Stop the service and temporarily point DATABASE_URL at an invalid host
export DATABASE_URL="postgres://invalid-host/tipstream"
# Service should fail fast and report the connection issue
curl http://localhost:3100/api/tips
# Should return error appropriately
```

### Simulated Rate Limiting

```bash
# Make rapid requests to test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3100/api/chainhook/events \
    -H "Content-Type: application/json" \
    -d '{"apply":[]}'
done
# Should receive 429 responses after limit
```

### Load Testing

```bash
# Test with realistic event volume
ab -n 1000 -c 10 \
  -H "Authorization: Bearer $CHAINHOOK_AUTH_TOKEN" \
  -T "application/json" \
  -p payload.json \
  http://localhost:3100/api/chainhook/events
```

## Escalation Path

1. **Level 1**: Check health endpoint and logs
2. **Level 2**: Verify disk space and database connectivity
3. **Level 3**: Inspect and repair the database snapshot or schema
4. **Level 4**: Restore from backup or snapshot
5. **Level 5**: Full service migration to new host
