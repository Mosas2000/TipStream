# Systemd Service Configuration for Chainhook

This example shows how to configure Chainhook as a systemd service with metrics access control.

## File: /etc/systemd/system/chainhook.service

```ini
[Unit]
Description=Chainhook - Event Indexing Service
Documentation=https://github.com/Mosas2000/TipStream
After=network-online.target postgresql.service redis.service
Wants=network-online.target
Requires=postgresql.service redis.service

[Service]
Type=simple
User=chainhook
Group=chainhook
WorkingDirectory=/opt/chainhook
ExecStart=/usr/bin/node /opt/chainhook/chainhook/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=chainhook

# Environment variables
EnvironmentFile=/etc/chainhook/chainhook.env
EnvironmentFile=-/etc/chainhook/chainhook.env.local

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/var/lib/chainhook /var/log/chainhook

# Resource limits
LimitNOFILE=65536
LimitNPROC=512
MemoryLimit=1G
CPUQuota=200%

# Startup and shutdown timeout
TimeoutStartSec=30s
TimeoutStopSec=10s

[Install]
WantedBy=multi-user.target
```

## File: /etc/chainhook/chainhook.env

```bash
# Service configuration
NODE_ENV=production
LOG_LEVEL=info

# Metrics access control
METRICS_AUTH_TOKEN=YOUR_SECURE_TOKEN_HERE
HEALTH_CHECK_ALWAYS_ENABLED=true

# Database
DATABASE_URL=postgresql://chainhook:password@localhost:5432/chainhook

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=3100
HOST=127.0.0.1
```

## Installation Steps

### Step 1: Create Application Directory

```bash
sudo mkdir -p /opt/chainhook
sudo mkdir -p /var/log/chainhook
sudo mkdir -p /var/lib/chainhook

sudo chown -R chainhook:chainhook /opt/chainhook
sudo chown -R chainhook:chainhook /var/log/chainhook
sudo chown -R chainhook:chainhook /var/lib/chainhook

sudo chmod 750 /opt/chainhook
sudo chmod 750 /var/log/chainhook
sudo chmod 750 /var/lib/chainhook
```

### Step 2: Create User and Group

```bash
sudo useradd -r -s /bin/false -d /opt/chainhook chainhook
```

### Step 3: Install Node.js Application

```bash
cd /tmp
git clone https://github.com/Mosas2000/TipStream.git
cd TipStream
npm ci --production
sudo cp -r . /opt/chainhook/

# Install Node modules
cd /opt/chainhook
npm ci --production
```

### Step 4: Create Environment File

```bash
sudo mkdir -p /etc/chainhook
sudo tee /etc/chainhook/chainhook.env > /dev/null <<EOF
NODE_ENV=production
LOG_LEVEL=info
METRICS_AUTH_TOKEN=$(openssl rand -base64 32)
HEALTH_CHECK_ALWAYS_ENABLED=true
DATABASE_URL=postgresql://chainhook:password@localhost:5432/chainhook
REDIS_URL=redis://localhost:6379
PORT=3100
HOST=127.0.0.1
EOF

sudo chmod 640 /etc/chainhook/chainhook.env
sudo chown chainhook:chainhook /etc/chainhook/chainhook.env
```

### Step 5: Install Systemd Service

```bash
sudo cp chainhook.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable chainhook
sudo systemctl start chainhook
```

## Service Management

### Check Service Status

```bash
sudo systemctl status chainhook
```

### View Service Logs

```bash
sudo journalctl -u chainhook -f          # Follow logs
sudo journalctl -u chainhook -n 100      # Last 100 lines
sudo journalctl -u chainhook --since "1 hour ago"
```

### Restart Service

```bash
sudo systemctl restart chainhook
```

### Stop Service

```bash
sudo systemctl stop chainhook
```

### View Metrics Auth Token

```bash
sudo cat /etc/chainhook/chainhook.env | grep METRICS_AUTH_TOKEN
```

## Verification

### Test Health Endpoint

```bash
curl http://localhost:3100/health
```

### Test Metrics Endpoint (without token)

```bash
curl -i http://localhost:3100/metrics
# Should return 401 Unauthorized
```

### Test Metrics Endpoint (with token)

```bash
TOKEN=$(sudo cat /etc/chainhook/chainhook.env | grep METRICS_AUTH_TOKEN | cut -d= -f2)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3100/metrics
# Should return 200 OK with metrics
```

## Log Rotation

Create `/etc/logrotate.d/chainhook`:

```
/var/log/chainhook/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 chainhook chainhook
    postrotate
        systemctl reload chainhook > /dev/null 2>&1 || true
    endscript
}
```

Enable log rotation:

```bash
sudo cp chainhook /etc/logrotate.d/
```

## Monitoring Integration

### Prometheus Scrape Configuration

Add to Prometheus config:

```yaml
scrape_configs:
  - job_name: 'chainhook'
    metrics_path: '/metrics'
    bearer_token: 'YOUR_METRICS_TOKEN'
    static_configs:
      - targets: ['localhost:3100']
```

### Monitoring Script

Create `/opt/chainhook/bin/check_service.sh`:

```bash
#!/bin/bash
set -e

# Check if service is running
if ! systemctl is-active --quiet chainhook; then
    echo "ERROR: chainhook service is not running"
    exit 1
fi

# Check health endpoint
if ! curl -f http://localhost:3100/health > /dev/null 2>&1; then
    echo "ERROR: health endpoint not responding"
    exit 1
fi

# Check database connectivity (from health check)
HEALTH=$(curl -s http://localhost:3100/health)
if echo "$HEALTH" | grep -q '"ok":false'; then
    echo "ERROR: service health check failed"
    echo "$HEALTH"
    exit 1
fi

echo "OK: chainhook service is healthy"
exit 0
```

Enable monitoring:

```bash
chmod +x /opt/chainhook/bin/check_service.sh
echo "*/5 * * * * /opt/chainhook/bin/check_service.sh" | sudo crontab -
```

## Troubleshooting

### Service Fails to Start

```bash
# Check logs
sudo journalctl -u chainhook -n 50 -p err

# Check environment variables
sudo systemctl cat chainhook

# Test manually
cd /opt/chainhook
/usr/bin/node chainhook/server.js
```

### Metrics Not Accessible

```bash
# Verify token is set
sudo cat /etc/chainhook/chainhook.env | grep METRICS_AUTH_TOKEN

# Verify service is listening
sudo netstat -tlnp | grep 3100

# Check firewall
sudo ufw status
sudo ufw allow 3100
```

### High CPU/Memory Usage

```bash
# Check resource usage
ps aux | grep chainhook

# Check logs for errors
sudo journalctl -u chainhook -f

# Check database/redis connectivity
curl http://localhost:3100/health
```
