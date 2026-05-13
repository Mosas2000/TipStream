# Rate Limit Operations Runbook

## Quick Reference

### Check Current Configuration

```bash
export CHAINHOOK_AUTH_TOKEN="your-token"
./examples/rate-limit-check.sh
```

### Common Scenarios

```bash
# DDoS attack response
./examples/rate-limit-incident-response.sh attack

# Return to normal
./examples/rate-limit-incident-response.sh normal

# Handle legitimate spike
./examples/rate-limit-incident-response.sh spike
```

## Incident Response Procedures

### Scenario 1: Suspected DDoS Attack

**Symptoms**:
- High rate of 429 responses in metrics
- Single or few IPs making excessive requests
- Service degradation

**Response**:

1. Verify the attack:
```bash
curl http://localhost:3100/metrics \
  -H "Authorization: Bearer ${METRICS_AUTH_TOKEN}" \
  | grep rate_limit
```

2. Check current configuration:
```bash
./examples/rate-limit-check.sh
```

3. Tighten limits immediately:
```bash
./examples/rate-limit-incident-response.sh attack
```

4. Monitor impact:
```bash
watch -n 5 'curl -s http://localhost:3100/metrics \
  -H "Authorization: Bearer ${METRICS_AUTH_TOKEN}" \
  | grep -E "(rate_limit|requests_total)"'
```

5. Document the incident:
```bash
echo "$(date): Applied attack mitigation - 10 req/min" >> /var/log/rate-limit-changes.log
```

6. After attack subsides, gradually relax:
```bash
# Step 1: Moderate limits
./examples/rate-limit-incident-response.sh moderate

# Wait 5-10 minutes and monitor

# Step 2: Return to normal
./examples/rate-limit-incident-response.sh normal
```

### Scenario 2: Legitimate Traffic Spike

**Symptoms**:
- Increased 429 responses
- Traffic from known legitimate sources
- Expected event (product launch, marketing campaign)

**Response**:

1. Verify traffic is legitimate:
```bash
# Check metrics for IP distribution
curl http://localhost:3100/metrics \
  -H "Authorization: Bearer ${METRICS_AUTH_TOKEN}"
```

2. Increase limits temporarily:
```bash
./examples/rate-limit-incident-response.sh spike
```

3. Monitor service health:
```bash
curl http://localhost:3100/health
```

4. After spike, return to normal:
```bash
./examples/rate-limit-incident-response.sh normal
```

### Scenario 3: Gradual Adjustment

**Use Case**: Fine-tuning limits based on observed patterns

**Procedure**:

1. Check current configuration:
```bash
./examples/rate-limit-check.sh
```

2. Make incremental change:
```bash
./examples/rate-limit-update.sh 75 60000
```

3. Monitor for 15-30 minutes

4. Adjust further if needed:
```bash
./examples/rate-limit-update.sh 50 60000
```

5. Update environment variables for next restart:
```bash
# In .env or deployment config
RATE_LIMIT_MAX_REQUESTS=50
RATE_LIMIT_WINDOW_MS=60000
```

## Monitoring

### Key Metrics

Monitor these metrics from `/metrics` endpoint:

- `rate_limit_violations_total` - Total rate limit hits
- `requests_total` - Total requests received
- `requests_failed_total` - Failed requests
- `response_time_ms` - Response time distribution

### Alert Thresholds

Set up alerts for:

- Rate limit violations > 100/minute
- Failed requests > 10% of total
- Response time > 1000ms (p95)
- Configuration changes (audit log)

### Log Monitoring

Watch for configuration changes:

```bash
tail -f /var/log/chainhook.log | grep "Rate limit configuration updated"
```

## Troubleshooting

### Problem: Configuration Update Fails

**Symptoms**: POST request returns 400 or 401

**Solutions**:

1. Check authentication:
```bash
echo $CHAINHOOK_AUTH_TOKEN
```

2. Verify parameter ranges:
- maxRequests: 1-10000
- windowMs: 1000-3600000

3. Check request format:
```bash
curl -v -X POST http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer ${CHAINHOOK_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"maxRequests": 100, "windowMs": 60000}'
```

### Problem: Changes Not Taking Effect

**Symptoms**: Rate limiting behavior unchanged after update

**Solutions**:

1. Verify configuration was applied:
```bash
./examples/rate-limit-check.sh
```

2. Check server logs for errors:
```bash
tail -f /var/log/chainhook.log
```

3. Verify service is running:
```bash
curl http://localhost:3100/health
```

### Problem: Too Many False Positives

**Symptoms**: Legitimate users being rate limited

**Solutions**:

1. Analyze traffic patterns:
```bash
curl http://localhost:3100/metrics \
  -H "Authorization: Bearer ${METRICS_AUTH_TOKEN}"
```

2. Increase limits:
```bash
./examples/rate-limit-update.sh 150 60000
```

3. Consider implementing IP whitelisting (future enhancement)

## Best Practices

### Before Making Changes

1. Check current metrics
2. Document reason for change
3. Have rollback plan ready
4. Notify team of change

### During Changes

1. Make incremental adjustments
2. Monitor impact continuously
3. Keep communication channel open
4. Document observations

### After Changes

1. Monitor for 15-30 minutes
2. Update environment variables if permanent
3. Document outcome in runbook
4. Share learnings with team

## Automation

### Automated Response Script

Create a monitoring script that automatically responds to attacks:

```bash
#!/bin/bash
# auto-rate-limit-response.sh

THRESHOLD=1000  # violations per minute
CURRENT_VIOLATIONS=$(curl -s http://localhost:3100/metrics \
  -H "Authorization: Bearer ${METRICS_AUTH_TOKEN}" \
  | grep rate_limit_violations_total \
  | awk '{print $2}')

if [ "$CURRENT_VIOLATIONS" -gt "$THRESHOLD" ]; then
  echo "High rate limit violations detected: $CURRENT_VIOLATIONS"
  ./examples/rate-limit-incident-response.sh attack
  # Send alert
  echo "Rate limits tightened automatically" | mail -s "Rate Limit Alert" ops@example.com
fi
```

### Scheduled Checks

Add to crontab for regular monitoring:

```cron
# Check rate limit status every 5 minutes
*/5 * * * * /path/to/examples/rate-limit-check.sh >> /var/log/rate-limit-checks.log 2>&1
```

## Emergency Contacts

- On-call Engineer: [contact info]
- Security Team: [contact info]
- Infrastructure Team: [contact info]

## Related Documentation

- [RATE_LIMIT_RUNTIME_CONFIG.md](./RATE_LIMIT_RUNTIME_CONFIG.md) - Complete API documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment configuration guide
- [README.md](./README.md) - Service overview
