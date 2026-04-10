# Chainhook Service Recovery Guide

## Overview

This guide covers procedures for recovering the chainhook service from various failure scenarios while maintaining data integrity and operational continuity.

## Failure Scenarios

### Scenario 1: Data File Corruption

**Symptoms:**
- Service fails to parse events.json
- Error messages about invalid JSON
- Increased 400 responses from API endpoints

**Recovery Steps:**

1. Stop the service:
```bash
systemctl stop tipstream-chainhook
```

2. Backup corrupted file:
```bash
cp data/events.json data/events.json.corrupted.$(date +%s)
```

3. Attempt JSON recovery (if partial):
```bash
jq . data/events.json.corrupted.* | jq -s '.' > data/events.json.recovered
```

4. Verify integrity:
```bash
jq . data/events.json.recovered > /dev/null && echo "Valid JSON"
```

5. Restore recovered data:
```bash
mv data/events.json.recovered data/events.json
```

6. Restart service:
```bash
systemctl start tipstream-chainhook
```

7. Verify via health check:
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
du -sh data/
df -h
```

2. Archive old events:
```bash
# Create archive of events older than 30 days
jq '[.[] | select(.timestamp < now - (30 * 86400000))]' data/events.json > data/events.old.json
jq '[.[] | select(.timestamp >= now - (30 * 86400000))]' data/events.json > data/events.new.json
```

3. Move old events to external storage:
```bash
aws s3 cp data/events.old.json s3://backup-bucket/chainhook/$(date +%Y-%m-%d)/
```

4. Replace with pruned dataset:
```bash
mv data/events.new.json data/events.json
```

5. Restart service:
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

3. Verify file permissions:
```bash
ls -la data/
chmod 755 data/
```

4. Verify data file integrity:
```bash
jq empty data/events.json
```

5. Attempt manual start with verbose logging:
```bash
LOG_LEVEL=DEBUG node server.js
```

6. If successful, restart via systemd:
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
mkdir -p $BACKUP_DIR
cp /var/lib/tipstream-chainhook/data/events.json $BACKUP_DIR/events.$(date +%Y-%m-%d).json
aws s3 sync $BACKUP_DIR s3://backup-bucket/chainhook/
find $BACKUP_DIR -mtime +30 -delete
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

2. Create service directory:
```bash
mkdir -p /var/lib/tipstream-chainhook/data
```

3. Restore data:
```bash
aws s3 cp s3://backup-bucket/chainhook/events.YYYY-MM-DD.json /var/lib/tipstream-chainhook/data/events.json
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
# Create invalid JSON to test recovery
echo "{ invalid json" > data/events.json
# Service should gracefully handle
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
2. **Level 2**: Verify disk space and file permissions
3. **Level 3**: Inspect and potentially repair data file
4. **Level 4**: Restore from backup
5. **Level 5**: Full service migration to new host
