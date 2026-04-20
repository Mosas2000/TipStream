# Security Hardening Guide for Chainhook Metrics

This guide provides security best practices for protecting the metrics endpoint in production.

## Network Security

### IP Allowlisting

Restrict metrics access to known monitoring infrastructure:

```nginx
# nginx configuration
location /metrics {
    allow 10.0.1.100;       # Prometheus
    allow 10.0.2.50;        # Grafana
    allow 192.168.1.0/24;   # Corporate network
    deny all;
}
```

### Firewall Rules

```bash
# Allow metrics only from monitoring infrastructure
sudo ufw allow from 10.0.1.100 to any port 3100
sudo ufw allow from 10.0.2.50 to any port 3100
sudo ufw deny to any port 3100

# Verify rules
sudo ufw status verbose
```

### Network Segmentation

Deploy Chainhook in a private network:

```bash
# AWS VPC configuration
- Public subnet: Nginx reverse proxy
- Private subnet: Chainhook application
- Private subnet: PostgreSQL, Redis
```

## Authentication Security

### Token Generation

Generate cryptographically secure tokens:

```bash
# Minimum 32 bytes (256 bits)
openssl rand -base64 32

# Output example
KGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN=
```

### Token Storage

Never store tokens in plain text:

```bash
# Use secrets management system
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Kubernetes Secrets

# Example: Vault
vault kv put secret/chainhook/metrics METRICS_AUTH_TOKEN="..."
```

### Token Rotation

Rotate tokens regularly:

```bash
#!/bin/bash
# Daily token rotation script

OLD_TOKEN=$(grep METRICS_AUTH_TOKEN /etc/chainhook/chainhook.env)
NEW_TOKEN=$(openssl rand -base64 32)

# Update environment
sed -i "s/^METRICS_AUTH_TOKEN=.*/METRICS_AUTH_TOKEN=$NEW_TOKEN/" \
  /etc/chainhook/chainhook.env

# Restart service
systemctl restart chainhook

# Update monitoring systems
# (Prometheus, Grafana, etc.)

# Log rotation event
echo "$(date -u) - Metrics token rotated" >> /var/log/chainhook-audit.log
```

## Transport Security

### TLS/HTTPS

Enable TLS for all metrics access:

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/ssl/certs/chainhook.crt;
    ssl_certificate_key /etc/ssl/private/chainhook.key;
    
    # TLS 1.2 and 1.3 only
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
}
```

### Certificate Management

```bash
# Using Let's Encrypt
certbot certonly --standalone -d chainhook.example.com

# Auto-renewal
systemctl enable certbot.timer
systemctl start certbot.timer
```

## Access Logging and Monitoring

### Request Logging

Configure comprehensive logging:

```nginx
log_format metrics_access '$remote_addr - $remote_user [$time_local] '
                         '"$request" $status $body_bytes_sent '
                         'authorization=$http_authorization '
                         'response_time=$request_time';

location /metrics {
    access_log /var/log/nginx/metrics.log metrics_access;
}
```

### Real-time Monitoring

Monitor access patterns:

```bash
# Monitor successful requests
tail -f /var/log/nginx/metrics.log | grep ' 200 '

# Monitor unauthorized requests
tail -f /var/log/nginx/metrics.log | grep ' 401 '

# Count requests by IP
awk '{print $1}' /var/log/nginx/metrics.log | sort | uniq -c | sort -rn
```

### Alert Configuration

```yaml
# Prometheus alerts
groups:
  - name: metrics_security
    rules:
      - alert: UnauthorizedMetricsAccess
        expr: rate(chainhook_metrics_401_total[5m]) > 5
        for: 5m
        annotations:
          summary: "High rate of unauthorized metrics requests"

      - alert: MetricsAccessFromUnknownIP
        expr: |
          count by (remote_ip) (
            rate(chainhook_metrics_requests_total[5m])
          ) > 0
        for: 1m
        # Check remote_ip against allowlist
```

## Audit Logging

### Comprehensive Audit Trail

```bash
# Create audit log directory
mkdir -p /var/log/chainhook/audit
chown chainhook:chainhook /var/log/chainhook/audit

# Log all metrics access
METRICS_AUTH_TOKEN="..." \
curl -H "Authorization: Bearer $METRICS_AUTH_TOKEN" \
  http://localhost:3100/metrics 2>&1 | \
  tee -a /var/log/chainhook/audit/metrics.log
```

### Audit Log Review

```bash
# Find unauthorized access attempts
grep "401" /var/log/nginx/metrics.log | wc -l

# Find access from unexpected IPs
grep -v "10.0.1.100\|10.0.2.50" /var/log/nginx/metrics.log

# Find token changes
grep "METRICS_AUTH_TOKEN" /var/log/chainhook-audit.log
```

## Secrets Management Integration

### HashiCorp Vault

```bash
# Store token in Vault
vault kv put secret/chainhook/prod METRICS_AUTH_TOKEN="..."

# Retrieve token at startup
#!/bin/bash
export VAULT_ADDR="https://vault.example.com:8200"
export VAULT_TOKEN="s.abc123..."

TOKEN=$(vault kv get -field=METRICS_AUTH_TOKEN secret/chainhook/prod)
export METRICS_AUTH_TOKEN="$TOKEN"

systemctl start chainhook
```

### AWS Secrets Manager

```bash
# Store token
aws secretsmanager create-secret \
  --name chainhook/metrics-auth-token \
  --secret-string "KGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN="

# Retrieve token
aws secretsmanager get-secret-value \
  --secret-id chainhook/metrics-auth-token \
  --query SecretString
```

### Kubernetes Secrets

```bash
# Create secret
kubectl create secret generic chainhook-metrics \
  --from-literal=METRICS_AUTH_TOKEN="..."

# Mount in deployment
volumeMounts:
- name: metrics-secret
  mountPath: /etc/chainhook/secrets
  readOnly: true

volumes:
- name: metrics-secret
  secret:
    secretName: chainhook-metrics
```

## Compliance and Auditing

### PCI DSS Compliance

- TLS 1.2 or higher
- Regular token rotation
- Comprehensive audit logging
- IP allowlisting
- Strong token generation

### SOC 2 Compliance

- Access logging (what, when, who)
- Change audit trail
- Token rotation procedures
- Incident response procedures

### Audit Checklist

- [ ] Token is 32+ bytes of random data
- [ ] Token stored in secure vault
- [ ] TLS/HTTPS enabled for all connections
- [ ] IP allowlist configured
- [ ] Request logging enabled
- [ ] Monitoring and alerts configured
- [ ] Token rotation schedule documented
- [ ] Access logs retained for 90+ days
- [ ] No tokens in version control
- [ ] Security review completed monthly

## Incident Response

### Suspected Token Breach

```bash
# 1. Generate new token immediately
NEW_TOKEN=$(openssl rand -base64 32)

# 2. Update all systems
# - Update environment variable
# - Update monitoring systems
# - Update reverse proxy

# 3. Restart service
systemctl restart chainhook

# 4. Monitor for unauthorized access
tail -f /var/log/nginx/metrics.log | grep " 401 "

# 5. Review access logs
grep "2025-01" /var/log/nginx/metrics.log | \
  awk '{print $1}' | sort | uniq -c | sort -rn

# 6. Document incident
cat > /var/log/chainhook/incident-$(date +%s).txt << EOF
Date: $(date -u)
Type: Suspected metrics token breach
Actions taken:
- Generated new token: $NEW_TOKEN
- Updated all systems
- Reviewed access logs
- No unauthorized access detected
EOF
```

### Unauthorized Access Detected

```bash
# 1. Block suspicious IP
sudo ufw deny from <IP>

# 2. Check what was accessed
grep "<IP>" /var/log/nginx/metrics.log

# 3. Review metrics exposure
# Determine what data was exposed

# 4. Notify stakeholders
# - Security team
# - Monitoring team
# - Management

# 5. Investigate source
# - Check server access logs
# - Check firewall logs
# - Check VPN access logs
```

## Regular Security Reviews

### Monthly Review

- Review metrics access logs
- Check for unusual patterns
- Verify IP allowlist is current
- Confirm token rotation schedule

### Quarterly Review

- Rotate metrics token
- Review audit logs
- Update security documentation
- Penetration testing

### Annual Review

- Complete security assessment
- Review and update procedures
- Compliance verification
- Security training update
