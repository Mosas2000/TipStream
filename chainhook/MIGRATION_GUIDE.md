# Migration Guide: Enabling Metrics Authentication

This guide helps you migrate from open metrics to authenticated metrics access.

## Migration Phases

### Phase 1: Planning (Before Deployment)

**Timeline:** 1-2 weeks

1. Audit current metrics consumers:
   - Prometheus instances
   - Grafana dashboards
   - Custom monitoring scripts
   - Third-party monitoring integrations

2. Identify which systems need metrics:
   - Internal monitoring (Prometheus, Grafana)
   - External SaaS platforms (Datadog, New Relic, etc.)
   - Custom dashboards or alerts
   - Ad-hoc debugging and analysis

3. Document current metrics access patterns:
   - How metrics are currently being accessed
   - Who has access
   - What metrics are being used
   - Alert rules depending on metrics

4. Plan token distribution:
   - Vault or secrets manager integration
   - CI/CD pipeline updates
   - Documentation updates

### Phase 2: Pre-Production Testing (1-2 weeks)

1. Set up test environment with authentication:
```bash
# Staging environment configuration
METRICS_AUTH_TOKEN="staging-test-token-abc123def456ghi789jkl000"
HEALTH_CHECK_ALWAYS_ENABLED="true"
```

2. Configure Prometheus and Grafana in staging:
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'chainhook'
    bearer_token: 'staging-test-token-abc123def456ghi789jkl000'
    static_configs:
      - targets: ['chainhook-staging:3100']
```

3. Validate all monitoring still works:
   - Prometheus scraping
   - Grafana dashboard queries
   - Alert rules
   - Custom scripts

4. Test failure scenarios:
   - Remove token, verify 401
   - Wrong token, verify 401
   - Restart service, verify token still works

### Phase 3: Production Rollout

**Timeline:** Vary by deployment model

#### Option A: Gradual Rollout (Recommended)

**Week 1:**
- Notify users of upcoming change
- Publish migration guide
- Begin token distribution to internal teams

**Week 2:**
- Deploy to non-critical environments
- Monitor for issues
- Gather feedback

**Week 3:**
- Deploy to primary production
- Monitor metrics continuously
- Be prepared to rollback

**Week 4:**
- Complete rollout to all environments
- Update documentation
- Archive metrics access logs

#### Option B: Big Bang Rollout

1. Coordinate with all metrics consumers
2. Schedule deployment window (off-peak hours)
3. Generate tokens for all consumers
4. Deploy simultaneously
5. Have runbook ready for rollback

#### Option C: Blue-Green Deployment

1. Keep current system running (green)
2. Deploy new system with auth enabled (blue)
3. Switch traffic gradually to blue
4. Monitor metrics in parallel
5. Decommission green once stable

## Step-by-Step Migration

### Step 1: Generate Production Token

```bash
# Generate strong random token
TOKEN=$(openssl rand -base64 32)

# Store securely
# - In vault: vault kv put secret/chainhook/prod METRICS_AUTH_TOKEN="$TOKEN"
# - In Secrets Manager
# - In environment configuration system
# - In deployment infrastructure (Kubernetes secrets, etc.)

echo "Token generated: ${TOKEN:0:10}..."
```

### Step 2: Notify Stakeholders

Send notification to:
- Prometheus administrators
- Grafana administrators
- Monitoring team
- On-call engineers
- SREs

Template:
```
Subject: Chainhook Metrics Access Control - Action Required

We will be enabling authentication for the Chainhook metrics endpoint.

Timeline:
- Current: Metrics are publicly accessible
- [DATE]: Metrics will require bearer token authentication
- [DATE]: Health check remains always accessible

Action Required:
1. Update Prometheus configuration with bearer token
2. Update any custom monitoring scripts
3. Test in staging environment
4. Confirm readiness before [DATE]

Contact: [Team] for token and additional details
```

### Step 3: Update Prometheus Configuration

**Before:**
```yaml
scrape_configs:
  - job_name: 'chainhook'
    static_configs:
      - targets: ['chainhook.example.com:3100']
```

**After:**
```yaml
scrape_configs:
  - job_name: 'chainhook'
    bearer_token: 'YOUR_TOKEN_HERE'
    static_configs:
      - targets: ['chainhook.example.com:3100']
```

### Step 4: Test in Staging

```bash
# 1. Deploy with new token
METRICS_AUTH_TOKEN="test-token" \
HEALTH_CHECK_ALWAYS_ENABLED="true" \
npm start

# 2. Verify metrics require token
curl http://localhost:3100/metrics
# Expected: 401 Unauthorized

curl -H "Authorization: Bearer test-token" \
  http://localhost:3100/metrics
# Expected: 200 OK with metrics

# 3. Verify health check still works
curl http://localhost:3100/health
# Expected: 200 OK

# 4. Test Prometheus scraping
# (update Prometheus config with token)
# (wait for next scrape)
# (verify metrics appear in Prometheus)

# 5. Test Grafana dashboards
# (verify all dashboard queries return data)

# 6. Test alert rules
# (verify alerts are still evaluating)
```

### Step 5: Production Deployment

**Before Deployment Checklist:**
- [ ] All stakeholders notified
- [ ] All systems tested in staging
- [ ] Rollback plan documented
- [ ] Runbook prepared
- [ ] Team on-call for issues

**Deployment Steps:**

1. Schedule maintenance window (if needed)
2. Generate production token
3. Update environment configuration
4. Deploy chainhook with new configuration
5. Monitor metrics access logs
6. Verify all systems are working
7. Document completion

**Post-Deployment Validation:**
```bash
# 1. Verify metrics require authentication
curl http://chainhook.example.com:3100/metrics
# Expected: 401

# 2. Verify metrics work with token
TOKEN="$METRICS_AUTH_TOKEN"
curl -H "Authorization: Bearer $TOKEN" \
  http://chainhook.example.com:3100/metrics | jq '.methodProposal'
# Expected: numeric value

# 3. Verify health endpoint works
curl http://chainhook.example.com:3100/health | jq '.ok'
# Expected: true

# 4. Verify Prometheus is scraping
# Check Prometheus UI: Status > Targets
# Expected: chainhook job shows UP

# 5. Verify Grafana has data
# Check dashboard queries
# Expected: all queries return data

# 6. Monitor for errors
tail -f /var/log/chainhook/metrics-access.log | grep "401"
# Expected: only metrics.scrape requests appear

tail -f /var/log/chainhook/app.log | grep error
# Expected: no metrics-related errors
```

## Rollback Procedure

If issues occur after deployment:

### Immediate Rollback

```bash
# 1. Remove token from environment
unset METRICS_AUTH_TOKEN
# or
METRICS_AUTH_TOKEN="" systemctl restart chainhook

# 2. Restart service
systemctl restart chainhook

# 3. Verify metrics are accessible
curl http://chainhook.example.com:3100/metrics | head -20
# Expected: 200 OK with metrics

# 4. Notify team of rollback
# Document what went wrong

# 5. Investigation and remediation
# - Check logs for errors
# - Identify root cause
# - Fix issue
# - Plan redeployment
```

### Gradual Rollback

If only some systems are affected:

```bash
# 1. Identify affected systems
# e.g., Prometheus unable to scrape

# 2. Update token in affected systems
# Provide correct token or temporary bypass

# 3. Verify affected systems recover
curl -H "Authorization: Bearer $TOKEN" \
  http://chainhook.example.com:3100/metrics

# 4. Continue with other systems
# Don't roll back entire deployment if only one consumer affected
```

## Post-Migration Tasks

### Documentation Updates

1. Update API documentation
2. Update monitoring runbooks
3. Update deployment procedures
4. Update troubleshooting guides
5. Archive old procedures

### Team Training

- Train operations team on new procedures
- Document token rotation schedule
- Document security policies
- Update on-call documentation

### Compliance and Audit

- Document change in audit log
- Update security audit checklist
- Verify compliance with policies
- Archive migration details

### Performance Baseline

```bash
# Document metrics access performance
ab -n 1000 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  http://chainhook.example.com:3100/metrics

# Expected results:
# - Response time: < 100ms
# - Failed requests: 0
# - Success rate: 100%
```

## Troubleshooting During Migration

### Issue: Prometheus scraping fails after migration

**Quick Fix:**
```bash
# Verify token in Prometheus config
grep -A 5 "chainhook" /etc/prometheus/prometheus.yml

# Reload Prometheus
curl -X POST http://localhost:9090/-/reload

# Check scrape status in Prometheus UI
# Navigate to: Status > Targets
```

### Issue: Grafana dashboards show "no data" after migration

**Quick Fix:**
```bash
# Verify Prometheus has metrics
curl -H "Authorization: Bearer $TOKEN" \
  http://chainhook.example.com:3100/metrics | wc -l

# Verify Prometheus is scraping
# Check Prometheus target status (Status > Targets)

# Refresh Grafana dashboard
# Reload page or force refresh
```

### Issue: Some services still have 401 errors

**Quick Fix:**
```bash
# Identify which service is failing
grep "401" /var/log/nginx/metrics.log | awk '{print $1}' | sort | uniq

# Notify service owner
# Provide correct token
# Verify service updates its configuration
```

## Success Criteria

Migration is complete when:

- [x] All metrics consumers updated
- [x] All consumers successfully authenticating
- [x] No 401 errors in metrics access logs
- [x] Prometheus scraping metrics successfully
- [x] Grafana dashboards showing data
- [x] Alerts evaluating correctly
- [x] Team trained on new procedures
- [x] Documentation updated
- [x] Security audit completed
- [x] Monitoring and alerting in place

## Timeline Summary

| Phase | Duration | Activities |
|-------|----------|-----------|
| Planning | 1-2 weeks | Audit, identify consumers, plan rollout |
| Testing | 1-2 weeks | Deploy to staging, test all systems |
| Rollout | 1-4 weeks | Notify, deploy, validate per environment |
| Post-Migration | 1 week | Training, documentation, cleanup |

**Total: 4-9 weeks** (varies by environment complexity)
