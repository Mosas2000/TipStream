# Chainhook Service Operations Manual

## Service Administration

### Starting the Service

Development mode:
```bash
cd chainhook
npm install
npm start
```

Production mode (systemd):
```bash
systemctl start tipstream-chainhook
systemctl status tipstream-chainhook
```

With custom configuration:
```bash
PORT=3100 \
CHAINHOOK_AUTH_TOKEN="secret" \
CORS_ALLOWED_ORIGINS="https://api.example.com" \
node server.js
```

### Stopping the Service

Graceful shutdown (allows pending operations to complete):
```bash
systemctl stop tipstream-chainhook
```

The service automatically:
- Stops accepting new requests
- Flushes pending writes to disk
- Closes HTTP connections
- Exits cleanly within 30 seconds

### Restarting the Service

```bash
systemctl restart tipstream-chainhook
```

### Service Logs

View recent logs:
```bash
journalctl -u tipstream-chainhook -n 100 -f
```

View error logs only:
```bash
journalctl -u tipstream-chainhook -p err -n 50
```

View logs from specific time:
```bash
journalctl -u tipstream-chainhook --since "2024-04-10 14:00:00" --until "2024-04-10 15:00:00"
```

## Operational Checks

### Daily Health Check

```bash
#!/bin/bash
echo "Chainhook Service Health Check"
echo "==============================="

echo -n "Service running: "
curl -s http://localhost:3100/health > /dev/null && echo "OK" || echo "FAILED"

echo -n "Metrics available: "
curl -s http://localhost:3100/metrics > /dev/null && echo "OK" || echo "FAILED"

echo -n "Webhook endpoint responding: "
curl -s -X POST http://localhost:3100/api/chainhook/events \
  -H "Content-Type: application/json" \
  -d '{"apply":[]}' | jq -e '.ok' > /dev/null && echo "OK" || echo "FAILED"

echo -n "Data file integrity: "
jq empty data/events.json 2>/dev/null && echo "OK" || echo "FAILED"

echo -n "Disk space: "
USAGE=$(df data/ | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$USAGE" -lt 80 ]; then
  echo "OK ($USAGE%)"
else
  echo "WARNING ($USAGE%)"
fi
```

### Monitoring Key Metrics

```bash
# Get current metrics
curl -s http://localhost:3100/metrics | jq '.'

# Get specific metric
curl -s http://localhost:3100/metrics | jq '.events_indexed'

# Watch metrics over time
watch -n 5 'curl -s http://localhost:3100/metrics | jq "{indexed: .events_indexed, dedup: .events_deduplicated, success: .success_rate_percent}"'
```

### Event Inspection

View recent events:
```bash
curl http://localhost:3100/api/tips?limit=10 | jq '.tips'
```

View events for specific address:
```bash
curl "http://localhost:3100/api/tips/user/SP1234567890ABCDEF" | jq '.tips'
```

View aggregate statistics:
```bash
curl http://localhost:3100/api/stats | jq '.'
```

### Admin Event Review

View all admin events:
```bash
curl http://localhost:3100/api/admin/events | jq '.events'
```

View detected bypass attempts:
```bash
curl http://localhost:3100/api/admin/bypasses | jq '.bypasses'
```

## Performance Tuning

### Rate Limiting Configuration

Default: 100 requests per 60 seconds per IP

For higher traffic:
```bash
export RATE_LIMIT_MAX_REQUESTS=500
export RATE_LIMIT_WINDOW_MS=60000
systemctl restart tipstream-chainhook
```

### Memory Management

Monitor memory usage:
```bash
ps aux | grep "node server.js"
```

If memory grows excessively:
1. Check rate limiter cleanup logs
2. Verify no memory leaks in event processing
3. Consider archiving old events
4. Implement systemd memory limits

### Processing Performance

Check average processing time:
```bash
curl http://localhost:3100/metrics | jq '.avg_processing_ms'
```

If processing is slow:
1. Check system load: `uptime`
2. Check disk I/O: `iostat -x 1`
3. Check node memory: `node --max-old-space-size=2048 server.js`
4. Consider async event batching

## Data Management

### Event Data Inspection

Count total events:
```bash
jq '. | length' data/events.json
```

Find events by transaction:
```bash
jq '.[] | select(.txId == "0x...")' data/events.json
```

Find events by address:
```bash
jq '.[] | select(.event.sender == "SP1..." or .event.recipient == "SP1...")' data/events.json
```

### Data Compaction

Archive events older than 30 days:
```bash
jq --arg cutoff $(date -d '30 days ago' +%s000) \
   '[.[] | select(.timestamp | tonumber > ($cutoff | tonumber))]' \
   data/events.json > data/events.new.json && \
   mv data/events.new.json data/events.json
```

### Backup Verification

Verify backup integrity:
```bash
jq empty backup/events.json.bak && echo "Backup valid"
```

Compare backup and current:
```bash
diff -u <(jq -S . backup/events.json.bak) <(jq -S . data/events.json)
```

## Network Configuration

### Firewall Rules

Allow webhook ingestion on port 3100:
```bash
sudo ufw allow 3100/tcp from 10.0.0.0/8
```

Restrict to Chainhook server IPs:
```bash
sudo ufw allow 3100/tcp from 192.0.2.100
```

### Reverse Proxy Configuration

Nginx example:
```nginx
server {
    listen 443 ssl http2;
    server_name webhook.example.com;

    ssl_certificate /path/to/cert;
    ssl_certificate_key /path/to/key;

    location /api/chainhook/events {
        # Rate limiting at proxy level
        limit_req zone=webhook burst=20 nodelay;
        
        proxy_pass http://localhost:3100;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 10s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }

    location /health {
        proxy_pass http://localhost:3100;
        access_log off;
    }

    location /metrics {
        proxy_pass http://localhost:3100;
        auth_basic "metrics";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}
```

## Security Operations

### Token Rotation Schedule

Rotate authentication token quarterly:
```bash
# Generate new token
NEW_TOKEN=$(openssl rand -hex 32)

# Update systemd environment
sudo systemctl set-environment CHAINHOOK_AUTH_TOKEN="$NEW_TOKEN"
sudo systemctl restart tipstream-chainhook

# Update upstream Chainhook configuration
# (requires manual update in Chainhook server)
```

### CORS Allowlist Updates

Update allowed origins:
```bash
sudo systemctl set-environment \
  CORS_ALLOWED_ORIGINS="https://api.example.com,https://app.example.com"
sudo systemctl restart tipstream-chainhook
```

### Access Control

Restrict API access to internal networks:
```bash
iptables -A INPUT -p tcp --dport 3100 -s 10.0.0.0/8 -j ACCEPT
iptables -A INPUT -p tcp --dport 3100 -j DROP
```

## Incident Procedures

### High Error Rate Response

1. Check health: `curl http://localhost:3100/health`
2. Review logs: `journalctl -u tipstream-chainhook -n 100 -f`
3. Check metrics: `curl http://localhost:3100/metrics | jq '.success_rate_percent'`
4. If rate limiting active, check: `curl http://localhost:3100/metrics | jq '.requests_failed'`
5. Restart if needed: `systemctl restart tipstream-chainhook`

### Webhook Queue Backup

If Chainhook has queued events:
1. Increase rate limit temporarily: `RATE_LIMIT_MAX_REQUESTS=1000`
2. Restart service
3. Monitor ingestion: `watch -n 2 'curl -s http://localhost:3100/metrics | jq .events_indexed'`
4. Once caught up, return to normal limits

### Service Degradation

If responsiveness degrades:
1. Check CPU: `top -bn1 | head -10`
2. Check memory: `free -h`
3. Check disk: `df -h`
4. Check I/O: `iostat -x 1`
5. Identify bottleneck and address accordingly

## Regular Maintenance

### Weekly Tasks

- Review error logs for patterns
- Verify metrics are within expected ranges
- Test webhook delivery from staging
- Check disk usage trends

### Monthly Tasks

- Verify backup integrity
- Test recovery procedures
- Review and update rate limits based on traffic
- Update Node.js dependencies for security patches
- Rotate authentication token if needed

### Quarterly Tasks

- Capacity planning review
- Performance baseline comparison
- Security audit (logs, access, configuration)
- Documentation updates
- Disaster recovery drill

## Configuration Management

### Recommended systemd Unit

```ini
[Unit]
Description=TipStream Chainhook Service
After=network.target
StartLimitIntervalSec=60
StartLimitBurst=3

[Service]
Type=simple
User=tipstream
WorkingDirectory=/opt/tipstream-chainhook
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=chainhook
EnvironmentFile=/etc/default/tipstream-chainhook
MemoryAccounting=yes
MemoryMax=512M

[Install]
WantedBy=multi-user.target
```
